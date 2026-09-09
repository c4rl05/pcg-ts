var e=`{
  "formatVersion": 1,
  "seed": 2207,
  "meta": {
    "title": "three ways to connect the same cloud",
    "description": "One scatter, three \`connectPoints\` modes, offset side by side so the choice is visible rather than described. LEFT is \`radius\`: every pair under the radius, which is the dense neighbourhood graph and grows with the square of the point count. MIDDLE is \`gabriel\`: a pair survives only when no third point lies inside the SPHERE having that pair as its diameter. RIGHT is \`relativeNeighborhood\`: a pair survives only when no third point is closer to BOTH endpoints than they are to each other (the lune test). The Gabriel sphere sits INSIDE that lune, so it catches fewer witnesses and disqualifies fewer pairs — which is why the middle is denser than the right, and why \`relativeNeighborhood\` is a subset of \`gabriel\` and \`gabriel\` a subset of the Delaunay edges. That ordering is the whole reason to have both: the lune test cuts the short cross-links and leaves a branching, road-shaped net, while gabriel keeps them and closes the small polygons, so a scatter reads as plots, cracked ground or leaf venation. All three contain a minimum spanning tree, so none of them disconnects what the radius reached, and all three are halo-exact at \`haloWidth >= radius\` — a disqualifying witness is always nearer to an endpoint than the pair is to each other, so it is already inside the neighbourhood the cell had to hold anyway. The sphere is CLOSED and a point coincident with an endpoint is not counted as a third point: right angles are common (every unit lattice cell has two), and an open test would keep every one of those diagonals and return a cross-hatch instead of cells.",
    "tags": ["basics", "topology", "networks", "voronoi"]
  },
  "nodes": [
    {
      "id": "sites",
      "type": "pointScatterInBounds",
      "params": {
        "count": 140,
        "boundsMin": [-9, 0, -9],
        "boundsMax": [9, 0, 9]
      }
    },
    {
      "id": "dense",
      "type": "connectPoints",
      "params": { "mode": "radius", "radius": 4.5 }
    },
    {
      "id": "denseAt",
      "type": "transformPoints",
      "params": { "translate": [-21, 0, 0] }
    },
    {
      "id": "cells",
      "type": "connectPoints",
      "params": { "mode": "gabriel", "radius": 4.5 }
    },
    {
      "id": "roads",
      "type": "connectPoints",
      "params": { "mode": "relativeNeighborhood", "radius": 4.5 }
    },
    {
      "id": "roadsAt",
      "type": "transformPoints",
      "params": { "translate": [21, 0, 0] }
    },
    {
      "id": "all",
      "type": "mergePrimitives",
      "params": {}
    }
  ],
  "connections": [
    { "from": ["sites", "out"], "to": ["dense", "in"] },
    { "from": ["dense", "out"], "to": ["denseAt", "in"] },
    { "from": ["sites", "out"], "to": ["cells", "in"] },
    { "from": ["sites", "out"], "to": ["roads", "in"] },
    { "from": ["roads", "out"], "to": ["roadsAt", "in"] },
    { "from": ["denseAt", "out"], "to": ["all", "in"] },
    { "from": ["cells", "out"], "to": ["all", "in"] },
    { "from": ["roadsAt", "out"], "to": ["all", "in"] }
  ],
  "outputs": [{ "id": "all", "pin": "out", "name": "networks" }]
}
`;export{e as default};