var e=`{\r
  "formatVersion": 1,\r
  "seed": 1047,\r
  "meta": {\r
    "title": "Shade a faceted curve round, keep an edge sharp",\r
    "description": "\`extrudePolygon\` gives every wall band its own four points and one flat normal, so its creases are exact — and a twenty-sided tank shades as twenty planks. \`smoothNormals\` decides which creases were meant by ANGLE: each point's normal becomes the angle-weighted average of the faces around its position whose normals lie within \`angle\` degrees of its own, so the tank's walls (18 degrees apart) shade round while its lid and floor (90 degrees) stay sharp, and the square block merged beside it keeps every edge. Nothing else changes: no point is merged, split or moved, so the output has exactly the input's points, triangles and attributes, and only \`normal\` differs. Points are matched by POSITION within \`weldDistance\`, not by index, which is what lets bands that share no point shade as one surface. The faceted copy behind is the same tank without the node, for comparison. Run it on the rounded part before merging it with neighbours whose shallow corners it should not smooth into.",\r
    "tags": ["basics", "surface", "mesh", "normals", "shading"]\r
  },\r
  "nodes": [\r
    {\r
      "id": "tankPlan",\r
      "type": "subgraph",\r
      "params": { "count": 20, "size": [6, 6, 6], "center": [-5, 0, 0], "rotate": [0, 0, 0] },\r
      "ref": { "name": "shape/path-loop" }\r
    },\r
    {\r
      "id": "blockPlan",\r
      "type": "subgraph",\r
      "params": { "count": 4, "size": [5, 5, 5], "center": [5, 0, 0], "rotate": [0, 0, 0] },\r
      "ref": { "name": "shape/path-loop" }\r
    },\r
    {\r
      "id": "flatPlan",\r
      "type": "subgraph",\r
      "params": { "count": 20, "size": [6, 6, 6], "center": [-5, 0, -9], "rotate": [0, 0, 0] },\r
      "ref": { "name": "shape/path-loop" }\r
    },\r
    {\r
      "id": "tank",\r
      "type": "extrudePolygon",\r
      "params": { "distance": 4, "direction": "+y", "vector": [0, 1, 0], "caps": "both", "sides": true }\r
    },\r
    {\r
      "id": "block",\r
      "type": "extrudePolygon",\r
      "params": { "distance": 3, "direction": "+y", "vector": [0, 1, 0], "caps": "both", "sides": true }\r
    },\r
    {\r
      "id": "faceted",\r
      "type": "extrudePolygon",\r
      "params": { "distance": 4, "direction": "+y", "vector": [0, 1, 0], "caps": "both", "sides": true }\r
    },\r
    { "id": "both", "type": "mergePrimitives", "params": {} },\r
    { "id": "smooth", "type": "smoothNormals", "params": { "angle": 35, "weldDistance": 0.0001 } }\r
  ],\r
  "connections": [\r
    { "from": ["tankPlan", "out"], "to": ["tank", "in"] },\r
    { "from": ["blockPlan", "out"], "to": ["block", "in"] },\r
    { "from": ["flatPlan", "out"], "to": ["faceted", "in"] },\r
    { "from": ["tank", "out"], "to": ["both", "in"] },\r
    { "from": ["block", "out"], "to": ["both", "in"] },\r
    { "from": ["both", "out"], "to": ["smooth", "in"] }\r
  ],\r
  "outputs": [\r
    { "id": "smooth", "pin": "out", "name": "smooth" },\r
    { "id": "faceted", "pin": "out", "name": "faceted" }\r
  ]\r
}\r
`;export{e as default};