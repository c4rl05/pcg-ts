# Trees on hills

Rolling hills, with some hillsides too steep for anything to grow on. Trees
cover the gentle ground and stay off the steep slopes. Every tree is rooted in
the ground: none floats above it and none is sunk into it.

## What to deliver

Write `./graph.json`: a graph file that the `pcg-ts` package installed in this
directory loads and cooks.

Declare these outputs, with exactly these names:

- `terrain` (geometry): the hills, as a mesh of triangles (larger polygons are
  split into triangles from their first corner).
- `trees` (instances): the trees. Each instance's origin is the base of its
  trunk, where it meets the ground.

Units are metres, and Y is up. Two words used below:

- The surface under a point is the highest triangle directly above or below
  it; anything hidden under a higher triangle never counts.
- A wall is a triangle steeper than 75 degrees. The terrain's ground is its
  surface minus its walls, so the sides of a closed or skirted terrain drop
  out of the size, relief and steepness measures (a wall can still be under a
  tree, and counts as steep there).

What the brief means, in numbers:

- Size. Take the tightest convex outline around the ground seen from above.
  Its narrowest width across is between 150 m and 250 m, and its widest is no
  more than 360 m (a 200 m square, turned any way, is 200 m and 283 m). The
  terrain may face any direction and need not be square.
- No holes. Of evenly spaced ground points inside that outline (150 of them
  across its narrowest width), at least 95 in every 100 lie under a triangle.
- Relief. At least 10 m between the lowest and highest points of the ground.
- Ground steeper than 30 degrees is too steep to grow on (exactly 30 is still
  fine). Between a tenth and a half of the ground's area, seen from above, is
  that steep, measured on the mesh's own flat triangles, so there is real
  steep ground to avoid and real gentle ground to plant.
- The steep slopes stay bare: at least 95 in every 100 trees stand over a
  surface no steeper than 30 degrees. (The allowance is there for a tree that
  lands exactly on the seam between a gentle triangle and a steep one; it is
  not room to plant the slopes.)
- Every tree, without exception, stands over the terrain, with its base no
  more than 0.25 m above or below the surface directly under it.
- The gentle ground is planted throughout, not dotted. Cut the ground plane
  into 10 m squares lined up with the X and Z axes, with edges at whole
  multiples of 10 m. In each square take 25 evenly spaced points (a 5 by 5
  grid, one point at the centre of each 2 m square inside it); a square is
  gentle ground when at least 19 of its 25 points lie over a surface no
  steeper than 30 degrees. At
  least two in three of the gentle squares hold a tree.

The graph will be cooked at several different seeds, and it has to meet the
brief at every one of them. It must also cook to the same result every time,
however the cook is split up.

Work only in this directory, with the installed package. When the graph is
finished, print DONE.
