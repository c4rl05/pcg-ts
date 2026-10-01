var e=`{\r
  "formatVersion": 1,\r
  "seed": 1103,\r
  "meta": {\r
    "title": "Write a table of points into the graph",\r
    "description": "Some coordinates come from nowhere a rule can reach: a survey, a drawing, a catalogue. Here they are the eight bright stars of Orion, right ascension and declination flattened onto the ground at two units per degree (east to the left, north up, as the sky is seen), and \`pointList\` carries them IN the graph file: \`positions\` is a flat list of [x, y, z] triples, one point per triple, and each named column is declared once in \`columnNames\` and \`columnTypes\` and filled from \`columnValues\`, one column after another. The stars carry two: \`magnitude\` (f32, smaller is brighter), which a setAttribute turns into \`scale\` so Rigel and Betelgeuse draw largest, and \`color\` declared vec4, which OVERWRITES the standard colour attribute every point cloud has and reaches the renderer through \`colorAttr\` — red Betelgeuse among the blue-white giants (a host multiplies it into its own material, so the editor's yellow placeholder sphere warms every one of them). A second list draws the figure: the same positions again, in stroke order, with an i32 \`stroke\` column that \`pointsToPath\` splits on, one polyline per stroke. The per-point \`seed\` is hashed from the node seed and the point index exactly as pointGrid hashes it, and that is the point of the node: a pointGrid with countX = n plus one \`ramp(index(), [[0, v0], [1, v1], ...])\` per column was the old way to fake this table, and it costs a ramp search per point and a pair per value where this costs one number. \`dataInput\` is the other route to arbitrary points, but its items are injected by a host and serialize empty, so a graph built on it cannot be cooked from its file.",\r
    "tags": ["basics", "source", "attributes", "instancing", "path"]\r
  },\r
  "nodes": [\r
    {\r
      "id": "stars",\r
      "type": "pointList",\r
      "params": {\r
        "positions": [-9.586, 0, -14.814, 10.732, 0, 16.404, 5.434, 0, -12.7, 1.996, 0, 0.598, -0.106, 0, 2.404, -2.38, 0, 3.886, -5.878, 0, 19.34, 0.432, 0, -19.868],\r
        "columnNames": ["magnitude", "color"],\r
        "columnTypes": ["f32", "vec4"],\r
        "columnValues": [0.5, 0.13, 1.64, 2.25, 1.69, 1.77, 2.09, 3.39, 1, 0.55, 0.32, 1, 0.74, 0.84, 1, 1, 0.7, 0.8, 1, 1, 0.72, 0.82, 1, 1, 0.7, 0.8, 1, 1, 0.7, 0.8, 1, 1, 0.72, 0.82, 1, 1, 0.74, 0.84, 1, 1]\r
      }\r
    },\r
    {\r
      "id": "size",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "scale",\r
        "tupleSize": 3,\r
        "value": {\r
          "fn": "max",\r
          "args": [\r
            {\r
              "fn": "sub",\r
              "args": [\r
                {"fn": "param", "name": "brightest", "value": 5},\r
                {\r
                  "fn": "mul",\r
                  "args": [\r
                    {"fn": "attribute", "name": "magnitude"},\r
                    {"fn": "param", "name": "falloff", "value": 1.1}\r
                  ]\r
                }\r
              ]\r
            },\r
            0.2\r
          ]\r
        }\r
      }\r
    },\r
    {\r
      "id": "spawn",\r
      "type": "spawnInstances",\r
      "params": {"assetId": "sphere", "colorAttr": "color"}\r
    },\r
    {\r
      "id": "figure",\r
      "type": "pointList",\r
      "params": {\r
        "positions": [-5.878, 0, 19.34, -2.38, 0, 3.886, -9.586, 0, -14.814, 0.432, 0, -19.868, 5.434, 0, -12.7, 1.996, 0, 0.598, 10.732, 0, 16.404, -9.586, 0, -14.814, 5.434, 0, -12.7, -2.38, 0, 3.886, -0.106, 0, 2.404, 1.996, 0, 0.598],\r
        "columnNames": ["stroke"],\r
        "columnTypes": ["i32"],\r
        "columnValues": [0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 2]\r
      }\r
    },\r
    {"id": "lines", "type": "pointsToPath", "params": {"groupAttr": "stroke"}}\r
  ],\r
  "connections": [\r
    {"from": ["stars", "out"], "to": ["size", "in"]},\r
    {"from": ["size", "out"], "to": ["spawn", "in"]},\r
    {"from": ["figure", "out"], "to": ["lines", "in"]}\r
  ],\r
  "outputs": [\r
    {"id": "spawn", "pin": "instances", "name": "stars"},\r
    {"id": "lines", "pin": "out", "name": "figure"}\r
  ]\r
}\r
`;export{e as default};