var e=`{\r
  "formatVersion": 1,\r
  "seed": 1105,\r
  "meta": {\r
    "title": "Split a window into lights",\r
    "description": "\`splitPolygons\` cuts every polygon on \`in\` along the polylines on \`cutters\`, removes a strip \`kerf\` wide around each cut, and puts out the PIECES. The polygon here is an upright window opening in the 'xy' plane; the cutters are two mullions and a transom, drawn longer than the opening so they cut clean through it. Each cutter segment is buffered into a rectangle \`kerf\` wide with square ends, so where the transom meets a mullion the two gaps join squarely. \`kerf\` is field-capable on the CUTTERS' PRIMITIVE domain — one width per cutter polyline — so the transom, which carries a \`barWidth\` of 0.4, cuts a heavier gap than the mullions' 0.15 in the same cook. The primitive domain carries no P: a per-cutter value is a primitive attribute, written here by \`setAttribute\` with \`domain: \\"primitive\\"\`. Every piece carries its polygon's primitive attributes and comes out as a closed polyline, so six lights extrude straight into panes of glass. The opening's four corners come from a grid whose point order is not a walk round the edge, so \`pointsToPath\` sorts them by their angle about the centre (\`atan2\`) before closing the loop.",\r
    "tags": ["basics", "surface", "mesh", "extrude", "fields"]\r
  },\r
  "nodes": [\r
    {\r
      "id": "corners",\r
      "type": "pointGrid",\r
      "params": { "countX": 2, "countY": 2, "countZ": 1, "spacing": [6, 9, 1], "origin": [-3, 0, 0] }\r
    },\r
    {\r
      "id": "turn",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "turn",\r
        "value": {\r
          "fn": "atan2",\r
          "args": [\r
            { "fn": "sub", "args": [{ "fn": "component", "args": [{ "fn": "position" }], "index": 1 }, 4.5] },\r
            { "fn": "component", "args": [{ "fn": "position" }], "index": 0 }\r
          ]\r
        }\r
      }\r
    },\r
    {\r
      "id": "opening",\r
      "type": "pointsToPath",\r
      "params": { "closed": true, "orderAttr": "turn" }\r
    },\r
    {\r
      "id": "mullionEnds",\r
      "type": "pointGrid",\r
      "params": { "countX": 2, "countY": 2, "countZ": 1, "spacing": [2, 10, 1], "origin": [-1, -0.5, 0] }\r
    },\r
    {\r
      "id": "mullionKey",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "bar",\r
        "type": "i32",\r
        "value": { "fn": "floor", "args": [{ "fn": "component", "args": [{ "fn": "position" }], "index": 0 }] }\r
      }\r
    },\r
    {\r
      "id": "mullions",\r
      "type": "pointsToPath",\r
      "params": { "groupAttr": "bar" }\r
    },\r
    {\r
      "id": "mullionWidth",\r
      "type": "setAttribute",\r
      "params": { "name": "barWidth", "domain": "primitive", "value": 0.15 }\r
    },\r
    {\r
      "id": "transomEnds",\r
      "type": "pointLine",\r
      "params": { "count": 2, "start": [-3.5, 6, 0], "end": [3.5, 6, 0] }\r
    },\r
    {\r
      "id": "transom",\r
      "type": "pointsToPath",\r
      "params": {}\r
    },\r
    {\r
      "id": "transomWidth",\r
      "type": "setAttribute",\r
      "params": { "name": "barWidth", "domain": "primitive", "value": 0.4 }\r
    },\r
    {\r
      "id": "bars",\r
      "type": "mergePrimitives",\r
      "params": {}\r
    },\r
    {\r
      "id": "lights",\r
      "type": "splitPolygons",\r
      "params": {\r
        "kerf": { "fn": "attribute", "name": "barWidth" },\r
        "plane": "xy",\r
        "groupAttr": "",\r
        "snapDistance": 0.0001\r
      }\r
    },\r
    {\r
      "id": "glass",\r
      "type": "extrudePolygon",\r
      "params": { "distance": 0.2, "direction": "vector", "vector": [0, 0, 1], "caps": "both", "sides": true }\r
    }\r
  ],\r
  "connections": [\r
    { "from": ["corners", "out"], "to": ["turn", "in"] },\r
    { "from": ["turn", "out"], "to": ["opening", "in"] },\r
    { "from": ["mullionEnds", "out"], "to": ["mullionKey", "in"] },\r
    { "from": ["mullionKey", "out"], "to": ["mullions", "in"] },\r
    { "from": ["mullions", "out"], "to": ["mullionWidth", "in"] },\r
    { "from": ["transomEnds", "out"], "to": ["transom", "in"] },\r
    { "from": ["transom", "out"], "to": ["transomWidth", "in"] },\r
    { "from": ["mullionWidth", "out"], "to": ["bars", "in"] },\r
    { "from": ["transomWidth", "out"], "to": ["bars", "in"] },\r
    { "from": ["opening", "out"], "to": ["lights", "in"] },\r
    { "from": ["bars", "out"], "to": ["lights", "cutters"] },\r
    { "from": ["lights", "out"], "to": ["glass", "in"] }\r
  ],\r
  "outputs": [\r
    { "id": "glass", "pin": "out", "name": "glass" },\r
    { "id": "opening", "pin": "out", "name": "opening" },\r
    { "id": "bars", "pin": "out", "name": "bars" }\r
  ]\r
}\r
`;export{e as default};