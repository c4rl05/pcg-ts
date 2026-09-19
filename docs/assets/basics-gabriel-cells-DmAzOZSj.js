var e=`{\r
  "formatVersion": 1,\r
  "seed": 2207,\r
  "meta": {\r
    "title": "three ways to connect the same cloud",\r
    "description": "One scatter, three \`connectPoints\` modes, offset side by side so the choice is visible rather than described. LEFT is \`radius\`: every pair under the radius, which is the dense neighbourhood graph and grows with the square of the point count. MIDDLE is \`gabriel\`: a pair survives only when no third point lies inside the SPHERE having that pair as its diameter. RIGHT is \`relativeNeighborhood\`: a pair survives only when no third point is closer to BOTH endpoints than they are to each other (the lune test). The Gabriel sphere sits INSIDE that lune, so it catches fewer witnesses and disqualifies fewer pairs — which is why the middle is denser than the right, and why \`relativeNeighborhood\` is a subset of \`gabriel\` and \`gabriel\` a subset of the Delaunay edges. That ordering is the whole reason to have both: the lune test cuts the short cross-links and leaves a branching, road-shaped net, while gabriel keeps them and closes the small polygons, so a scatter reads as plots, cracked ground or leaf venation. All three contain a minimum spanning tree, so none of them disconnects what the radius reached, and all three are halo-exact at \`haloWidth >= radius\` — a disqualifying witness is always nearer to an endpoint than the pair is to each other, so it is already inside the neighbourhood the cell had to hold anyway. The sphere is CLOSED and a point coincident with an endpoint is not counted as a third point: right angles are common (every unit lattice cell has two), and an open test would keep every one of those diagonals and return a cross-hatch instead of cells.",\r
    "tags": ["basics", "topology", "networks", "voronoi"]\r
  },\r
  "nodes": [\r
    {\r
      "id": "sites",\r
      "type": "pointScatterInBounds",\r
      "params": {\r
        "count": 140,\r
        "boundsMin": [-9, 0, -9],\r
        "boundsMax": [9, 0, 9]\r
      }\r
    },\r
    {\r
      "id": "dense",\r
      "type": "connectPoints",\r
      "params": { "mode": "radius", "radius": 4.5 }\r
    },\r
    {\r
      "id": "denseAt",\r
      "type": "transformPoints",\r
      "params": { "translate": [-21, 0, 0] }\r
    },\r
    {\r
      "id": "cells",\r
      "type": "connectPoints",\r
      "params": { "mode": "gabriel", "radius": 4.5 }\r
    },\r
    {\r
      "id": "roads",\r
      "type": "connectPoints",\r
      "params": { "mode": "relativeNeighborhood", "radius": 4.5 }\r
    },\r
    {\r
      "id": "roadsAt",\r
      "type": "transformPoints",\r
      "params": { "translate": [21, 0, 0] }\r
    },\r
    {\r
      "id": "all",\r
      "type": "mergePrimitives",\r
      "params": {}\r
    }\r
  ],\r
  "connections": [\r
    { "from": ["sites", "out"], "to": ["dense", "in"] },\r
    { "from": ["dense", "out"], "to": ["denseAt", "in"] },\r
    { "from": ["sites", "out"], "to": ["cells", "in"] },\r
    { "from": ["sites", "out"], "to": ["roads", "in"] },\r
    { "from": ["roads", "out"], "to": ["roadsAt", "in"] },\r
    { "from": ["denseAt", "out"], "to": ["all", "in"] },\r
    { "from": ["cells", "out"], "to": ["all", "in"] },\r
    { "from": ["roadsAt", "out"], "to": ["all", "in"] }\r
  ],\r
  "outputs": [{ "id": "all", "pin": "out", "name": "networks" }]\r
}\r
`;export{e as default};