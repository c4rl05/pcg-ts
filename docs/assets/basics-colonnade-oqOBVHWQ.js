var e=`{\r
  "formatVersion": 1,\r
  "seed": 1103,\r
  "meta": {\r
    "title": "a colonnade spaced along the arc, not along the parameter",\r
    "description": "Thirty columns and the beam they carry, over a curve, and NOTHING HERE IS AN INSTANCE. Two nodes split the work: \`arcTile\` decides WHERE the repeated piece goes by measuring the path, and \`sweepProfile\` decides WHAT it is by turning points into triangles. A spawner would need a host that already owns a column model; this graph cooks the column.\\n\\nTHE PATH CURVES SO THAT THE SPACING RULE IS VISIBLE. It is 128 corner points at even ANGLE round a 26 x 15 ellipse — the parameterization anything walking a curve's own points gets for free, and the one an every-Nth-point pick inherits. Those points are 0.7367 apart at the ends of the major axis and 1.2759 apart at the ends of the minor one: the gaps at one end of the building are 73% wider than at the other, so a column per path point reads as uneven while every number in the graph still says 'even'. (The 1.7319 those chords measure is the polygon's answer to the ellipse's own arc-speed ratio, 26/15 = 1.7333; a 128-gon does not quite reach it.) \`arcTile\` reads the CHORD table instead: one range covering 131.10 of the loop's 131.12 units takes ceil(131.10 / 4.4) = 30 tiles at the centres of 30 equal sub-intervals, so the pitch is 4.370 whatever the curvature underneath is doing. On a straight path the two rules agree exactly and the lesson is invisible, which is the whole reason this is not a portico.\\n\\nTHE ONE GAP THAT IS NOT 4.370 IS THE SEAM, and it is worth knowing why. The range is a geometry rather than params — one point carrying \`runStart\` 0 and \`runSpan\` 131.10 — and 131.10 is deliberately two hundredths under the measured perimeter, because \`arcTile\` REFUSES a range longer than a closed path and a graph should not be one rounding away from failing to cook. Tiles land at the centres of equal sub-intervals OF THE RANGE, so that slack does not spread: it collects at the join, where the last tile and the first sit 4.391 apart instead of 4.370. Half a percent, invisible, and the honest price of the margin — ask for the full 131.12 and the ring is uniform to the last unit, at the cost of betting on a chord sum.\\n\\nTHE SHAFT IS SWEPT AND THE STATIONS ONLY PLACE IT. \`copyToPoints\` with \`topology: \\"keep\\"\` stamps a five-point vertical polyline on each of the 30 stations — 150 points, 30 polylines — and ONE \`sweepProfile\` turns all thirty into tubes, because that node sweeps every polyline it is handed. The swell, which a classical shaft has instead of a straight taper, is the field \`0.9 - 0.22 t*t\` on \`radius\`, and it is exact rather than averaged because \`sweepProfile\` does not resample: one ring per input point, at the point. \`t\` is \`fraction\` written on the TEMPLATE, BEFORE the copy — five points, so 0, 0.25, 0.5, 0.75, 1. Move that same \`setAttribute\` after \`copyToPoints\` and \`fraction\` ramps once across all 150 points instead, giving each column a thirtieth of the ramp: the swell vanishes and what comes out is thirty near-cylinders whose radius falls from 0.900 at the first to 0.680 at the last — a per-column radius where a per-column shape was meant. A ramp has to be authored on the domain it describes. Five rings is the resolution of that shape, and \`pathResample\` on the template is the knob, not a subdivision param this node does not have.\\n\\nTHE BEAM AND THE PLINTH ARE THE SAME NODE WITH ANOTHER PROFILE. The entablature is a 'square' section swept along the loop lifted to y 14.4, so it spans 13.3 to 15.5 and swallows the tops of the 14-unit shafts — which is why \`caps\` is off on the columns: a cap nobody can see is triangles nobody asked for. The plinth is a 'ribbon', an open two-point strip 4.0 wide lying flat on the ground, which is the profile a step wants and the one a closed section cannot be, since 'square' would put as much stone below the floor as above it.\\n\\nWHAT IT DELIBERATELY DOES NOT DO: no capitals, no flutes, no arch — an arched arcade wants the piece to span BETWEEN stations rather than stand on one, which measures the pitch instead of the position and belongs with the ranges. It does not vary the columns either, because a per-tile draw is what \`arcTile\`'s \`rangeNames\` exists to prevent and what \`basics-tile-an-arc\` is about. And it spawns nothing, so there is no asset id in it to check against a host.",\r
    "tags": ["basics", "path", "tiling", "surface", "sweep"]\r
  },\r
  "nodes": [\r
    {\r
      "id": "loop",\r
      "type": "subgraph",\r
      "params": { "count": 128, "size": [26, 1, 15] },\r
      "ref": { "name": "shape/path-loop" }\r
    },\r
    {\r
      "id": "range",\r
      "type": "pointLine",\r
      "params": { "mode": "endpoints", "count": 1, "start": [0, 0, 0], "end": [1, 0, 0] }\r
    },\r
    {\r
      "id": "start",\r
      "type": "setAttribute",\r
      "params": { "name": "runStart", "domain": "point", "type": "f32", "tupleSize": 1, "value": 0 }\r
    },\r
    {\r
      "id": "span",\r
      "type": "setAttribute",\r
      "params": { "name": "runSpan", "domain": "point", "type": "f32", "tupleSize": 1, "value": 131.1 }\r
    },\r
    {\r
      "id": "stations",\r
      "type": "arcTile",\r
      "params": {\r
        "startAttr": "runStart",\r
        "lengthAttr": "runSpan",\r
        "spacing": 4.4,\r
        "flare": 0,\r
        "axis": "+z"\r
      }\r
    },\r
    {\r
      "id": "shaftLine",\r
      "type": "pointLine",\r
      "params": { "mode": "endpoints", "count": 5, "start": [0, 0, 0], "end": [0, 14, 0] }\r
    },\r
    {\r
      "id": "shaftT",\r
      "type": "setAttribute",\r
      "params": { "name": "t", "domain": "point", "type": "f32", "tupleSize": 1, "value": { "fn": "fraction" } }\r
    },\r
    { "id": "shaftPath", "type": "pointsToPath", "params": { "closed": false } },\r
    { "id": "shafts", "type": "copyToPoints", "params": { "topology": "keep" } },\r
    {\r
      "id": "columns",\r
      "type": "sweepProfile",\r
      "params": {\r
        "profile": "circle",\r
        "sides": 12,\r
        "radius": {\r
          "fn": "sub",\r
          "args": [\r
            0.9,\r
            {\r
              "fn": "mul",\r
              "args": [0.22, { "fn": "mul", "args": [{ "fn": "attribute", "name": "t" }, { "fn": "attribute", "name": "t" }] }]\r
            }\r
          ]\r
        },\r
        "frame": "upHint",\r
        "up": [0, 0, 1],\r
        "joint": "miter",\r
        "caps": false\r
      }\r
    },\r
    { "id": "lift", "type": "transformPoints", "params": { "translate": [0, 14.4, 0] } },\r
    {\r
      "id": "beam",\r
      "type": "sweepProfile",\r
      "params": {\r
        "profile": "square",\r
        "radius": 1.1,\r
        "frame": "upHint",\r
        "up": [0, 1, 0],\r
        "joint": "miter"\r
      }\r
    },\r
    {\r
      "id": "plinth",\r
      "type": "sweepProfile",\r
      "params": {\r
        "profile": "ribbon",\r
        "width": 4,\r
        "frame": "upHint",\r
        "up": [0, 1, 0],\r
        "joint": "miter"\r
      }\r
    },\r
    { "id": "peristyle", "type": "mergePrimitives", "params": {} }\r
  ],\r
  "connections": [\r
    { "from": ["range", "out"], "to": ["start", "in"] },\r
    { "from": ["start", "out"], "to": ["span", "in"] },\r
    { "from": ["loop", "out"], "to": ["stations", "path"] },\r
    { "from": ["span", "out"], "to": ["stations", "ranges"] },\r
    { "from": ["shaftLine", "out"], "to": ["shaftT", "in"] },\r
    { "from": ["shaftT", "out"], "to": ["shaftPath", "in"] },\r
    { "from": ["shaftPath", "out"], "to": ["shafts", "source"] },\r
    { "from": ["stations", "out"], "to": ["shafts", "target"] },\r
    { "from": ["shafts", "out"], "to": ["columns", "in"] },\r
    { "from": ["loop", "out"], "to": ["lift", "in"] },\r
    { "from": ["lift", "out"], "to": ["beam", "in"] },\r
    { "from": ["loop", "out"], "to": ["plinth", "in"] },\r
    { "from": ["columns", "out"], "to": ["peristyle", "in"] },\r
    { "from": ["beam", "out"], "to": ["peristyle", "in"] },\r
    { "from": ["plinth", "out"], "to": ["peristyle", "in"] }\r
  ],\r
  "outputs": [{ "id": "peristyle", "pin": "out", "name": "colonnade" }]\r
}\r
`;export{e as default};