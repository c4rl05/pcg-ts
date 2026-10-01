var e=`{
  "formatVersion": 1,
  "seed": 1103,
  "meta": {
    "title": "Span the band between two paths",
    "description": "\`bridgePaths\` joins a polyline on \`from\` to one on \`to\` with a strip of quads, point i to point i, emitted as three-vertex 'poly' triangles — the same mesh topology \`sweepProfile\` and \`meshPrimitive\` emit. Here the two paths are the two edges of a road, made from one centreline: \`writeTangents\` gives each point its direction of travel, the cross product with up is the sideways unit, and each edge is the centreline moved half a width to one side. Because both edges come from the same points, they have the SAME point count, which is the one thing a pair must share — the node does not resample or match, point i simply meets point i, so two paths from different sources want \`pathResample\` mode 'count' first. The half-width widens along \`curveU\`, so the road flares from 1.5 to 7 units across, and the band follows whatever its edges do. FACING: with \`from\` on the right of the direction of travel and \`to\` on its left, the band faces UP; swap the pins or set \`flip\` to turn it over. The node writes a \`normal\` shared across each rung, so a bending band shades round, and a \`uv\` whose \`u\` is each edge's own normalized arc length and whose \`v\` runs 0 on \`from\` to 1 on \`to\`.",
    "tags": ["basics", "path", "curve", "surface", "mesh", "fields"]
  },
  "nodes": [
    {
      "id": "curve",
      "type": "subgraph",
      "params": { "count": 64, "wander": 0.4, "frequency": 2, "size": [40, 1, 40] },
      "ref": { "name": "shape/path-meander" }
    },
    {
      "id": "even",
      "type": "pathResample",
      "params": { "mode": "count", "count": 160 }
    },
    {
      "id": "tangent",
      "type": "writeTangents",
      "params": { "name": "tangent" }
    },
    {
      "id": "side",
      "type": "setAttribute",
      "params": {
        "name": "side",
        "tupleSize": 3,
        "value": {
          "fn": "mul",
          "args": [
            {
              "fn": "normalize",
              "args": [
                {
                  "fn": "cross",
                  "args": [
                    { "fn": "attribute", "name": "tangent", "tupleSize": 3 },
                    { "fn": "vec", "args": [0, 1, 0] }
                  ]
                }
              ]
            },
            { "fn": "remap", "args": [{ "fn": "attribute", "name": "curveU" }, 0, 1, 0.75, 3.5] }
          ]
        }
      }
    },
    {
      "id": "right",
      "type": "setAttribute",
      "params": {
        "name": "P",
        "tupleSize": 3,
        "value": {
          "fn": "add",
          "args": [{ "fn": "position" }, { "fn": "attribute", "name": "side", "tupleSize": 3 }]
        }
      }
    },
    {
      "id": "left",
      "type": "setAttribute",
      "params": {
        "name": "P",
        "tupleSize": 3,
        "value": {
          "fn": "sub",
          "args": [{ "fn": "position" }, { "fn": "attribute", "name": "side", "tupleSize": 3 }]
        }
      }
    },
    {
      "id": "road",
      "type": "bridgePaths",
      "params": { "pairAttr": "", "flip": false }
    }
  ],
  "connections": [
    { "from": ["curve", "out"], "to": ["even", "in"] },
    { "from": ["even", "out"], "to": ["tangent", "in"] },
    { "from": ["tangent", "out"], "to": ["side", "in"] },
    { "from": ["side", "out"], "to": ["right", "in"] },
    { "from": ["side", "out"], "to": ["left", "in"] },
    { "from": ["right", "out"], "to": ["road", "from"] },
    { "from": ["left", "out"], "to": ["road", "to"] }
  ],
  "outputs": [
    { "id": "road", "pin": "out", "name": "road" },
    { "id": "even", "pin": "out", "name": "centreline" }
  ]
}
`;export{e as default};