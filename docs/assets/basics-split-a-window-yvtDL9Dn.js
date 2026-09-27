var e=`{
  "formatVersion": 1,
  "seed": 1105,
  "meta": {
    "title": "split a window into lights",
    "description": "\`splitPolygons\` cuts every polygon on \`in\` along the polylines on \`cutters\`, removes a strip \`kerf\` wide around each cut, and puts out the PIECES. The polygon here is an upright window opening in the 'xy' plane; the cutters are two mullions and a transom, drawn longer than the opening so they cut clean through it. Each cutter segment is buffered into a rectangle \`kerf\` wide with square ends, so where the transom meets a mullion the two gaps join squarely. \`kerf\` is field-capable on the CUTTERS' PRIMITIVE domain — one width per cutter polyline — so the transom, which carries a \`barWidth\` of 0.4, cuts a heavier gap than the mullions' 0.15 in the same cook. The primitive domain carries no P: a per-cutter value is a primitive attribute, written here by \`setAttribute\` with \`domain: \\"primitive\\"\`. Every piece carries its polygon's primitive attributes and comes out as a closed polyline, so six lights extrude straight into panes of glass. The opening's four corners come from a grid whose point order is not a walk round the edge, so \`pointsToPath\` sorts them by their angle about the centre (\`atan2\`) before closing the loop.",
    "tags": ["basics", "surface", "mesh", "extrude", "fields"]
  },
  "nodes": [
    {
      "id": "corners",
      "type": "pointGrid",
      "params": { "countX": 2, "countY": 2, "countZ": 1, "spacing": [6, 9, 1], "origin": [-3, 0, 0] }
    },
    {
      "id": "turn",
      "type": "setAttribute",
      "params": {
        "name": "turn",
        "value": {
          "fn": "atan2",
          "args": [
            { "fn": "sub", "args": [{ "fn": "component", "args": [{ "fn": "position" }], "index": 1 }, 4.5] },
            { "fn": "component", "args": [{ "fn": "position" }], "index": 0 }
          ]
        }
      }
    },
    {
      "id": "opening",
      "type": "pointsToPath",
      "params": { "closed": true, "orderAttr": "turn" }
    },
    {
      "id": "mullionEnds",
      "type": "pointGrid",
      "params": { "countX": 2, "countY": 2, "countZ": 1, "spacing": [2, 10, 1], "origin": [-1, -0.5, 0] }
    },
    {
      "id": "mullionKey",
      "type": "setAttribute",
      "params": {
        "name": "bar",
        "type": "i32",
        "value": { "fn": "floor", "args": [{ "fn": "component", "args": [{ "fn": "position" }], "index": 0 }] }
      }
    },
    {
      "id": "mullions",
      "type": "pointsToPath",
      "params": { "groupAttr": "bar" }
    },
    {
      "id": "mullionWidth",
      "type": "setAttribute",
      "params": { "name": "barWidth", "domain": "primitive", "value": 0.15 }
    },
    {
      "id": "transomEnds",
      "type": "pointLine",
      "params": { "count": 2, "start": [-3.5, 6, 0], "end": [3.5, 6, 0] }
    },
    {
      "id": "transom",
      "type": "pointsToPath",
      "params": {}
    },
    {
      "id": "transomWidth",
      "type": "setAttribute",
      "params": { "name": "barWidth", "domain": "primitive", "value": 0.4 }
    },
    {
      "id": "bars",
      "type": "mergePrimitives",
      "params": {}
    },
    {
      "id": "lights",
      "type": "splitPolygons",
      "params": {
        "kerf": { "fn": "attribute", "name": "barWidth" },
        "plane": "xy",
        "groupAttr": "",
        "snapDistance": 0.0001
      }
    },
    {
      "id": "glass",
      "type": "extrudePolygon",
      "params": { "distance": 0.2, "direction": "vector", "vector": [0, 0, 1], "caps": "both", "sides": true }
    }
  ],
  "connections": [
    { "from": ["corners", "out"], "to": ["turn", "in"] },
    { "from": ["turn", "out"], "to": ["opening", "in"] },
    { "from": ["mullionEnds", "out"], "to": ["mullionKey", "in"] },
    { "from": ["mullionKey", "out"], "to": ["mullions", "in"] },
    { "from": ["mullions", "out"], "to": ["mullionWidth", "in"] },
    { "from": ["transomEnds", "out"], "to": ["transom", "in"] },
    { "from": ["transom", "out"], "to": ["transomWidth", "in"] },
    { "from": ["mullionWidth", "out"], "to": ["bars", "in"] },
    { "from": ["transomWidth", "out"], "to": ["bars", "in"] },
    { "from": ["opening", "out"], "to": ["lights", "in"] },
    { "from": ["bars", "out"], "to": ["lights", "cutters"] },
    { "from": ["lights", "out"], "to": ["glass", "in"] }
  ],
  "outputs": [
    { "id": "glass", "pin": "out", "name": "glass" },
    { "id": "opening", "pin": "out", "name": "opening" },
    { "id": "bars", "pin": "out", "name": "bars" }
  ]
}
`;export{e as default};