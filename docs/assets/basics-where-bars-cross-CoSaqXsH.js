var e=`{\r
  "formatVersion": 1,\r
  "seed": 1102,\r
  "meta": {\r
    "title": "Put a part where two bars cross",\r
    "description": "A braced panel: \`connectPoints\` joins every grid point to its neighbours along the rows, the columns and both diagonals, so each cell carries an X. \`segmentCrossings\` asks where those bars cross and emits ONE POINT PER CROSSING — here one at the middle of each cell's X, twenty-four in all. The row and column bars meet their neighbours only at the joints, and a meeting at a segment's END is a touch, not a crossing: the default \`endpoints: \\"exclude\\"\` leaves the joints out, which is what 'where do the bars cross' means on a lattice. Two segments cross when their closest approach is within \`tolerance\`, so the same rule finds coplanar bars (distance 0, give or take f32 rounding) and bars built a hair apart in 3D. Each point carries the two primitive ids (\`primA\` < \`primB\`) and the unit \`bisector\` of the two bars — the axis that halves their ACUTE angle — and a part set into the X lies along it: the cells are wider than they are tall, so the bosses here lie flat, along the shallow angle between the diagonals. Make the cells taller than they are wide and they stand up. The output is a plain point cloud, so it feeds \`spawnInstances\` directly.",\r
    "tags": ["basics", "topology", "sampler", "instancing"]\r
  },\r
  "nodes": [\r
    {\r
      "id": "joints",\r
      "type": "pointGrid",\r
      "params": { "countX": 7, "countY": 5, "countZ": 1, "spacing": [4, 2.5, 1], "origin": [-12, 0, 0] }\r
    },\r
    {\r
      "id": "bars",\r
      "type": "connectPoints",\r
      "params": { "mode": "radius", "radius": 4.9 }\r
    },\r
    {\r
      "id": "cross",\r
      "type": "segmentCrossings",\r
      "params": { "tolerance": 0.001, "endpoints": "exclude", "bisectorAttr": "bisector" }\r
    },\r
    {\r
      "id": "aim",\r
      "type": "orientAlongVector",\r
      "params": {\r
        "direction": { "fn": "attribute", "name": "bisector", "tupleSize": 3 },\r
        "up": [0, 0, 1],\r
        "axis": "+y"\r
      }\r
    },\r
    {\r
      "id": "size",\r
      "type": "setAttribute",\r
      "params": { "name": "scale", "tupleSize": 3, "value": { "fn": "vec", "args": [0.8, 2.2, 0.8] } }\r
    },\r
    {\r
      "id": "spawn",\r
      "type": "spawnInstances",\r
      "params": { "assetId": "boss" }\r
    }\r
  ],\r
  "connections": [\r
    { "from": ["joints", "out"], "to": ["bars", "in"] },\r
    { "from": ["bars", "out"], "to": ["cross", "in"] },\r
    { "from": ["cross", "out"], "to": ["aim", "in"] },\r
    { "from": ["aim", "out"], "to": ["size", "in"] },\r
    { "from": ["size", "out"], "to": ["spawn", "in"] }\r
  ],\r
  "outputs": [\r
    { "id": "bars", "pin": "out", "name": "lattice" },\r
    { "id": "spawn", "pin": "instances", "name": "crossings" }\r
  ]\r
}\r
`;export{e as default};