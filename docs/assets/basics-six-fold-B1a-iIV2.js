var e=`{\r
  "formatVersion": 1,\r
  "seed": 1106,\r
  "meta": {\r
    "title": "One arm, six times over",\r
    "description": "Symmetry BY CONSTRUCTION rather than by luck. One arm is authored — a shaft with seven pairs of side spurs whose length swells toward mid-arm and shrinks again at the tip — and the six-fold figure is that arm stamped onto six target points that share a position and differ in their \`rot\`. \`copyToPoints\` COMPOSES the target's transform onto the source (P = targetP + targetRot * (targetScale * sourceP), rot = targetRot * sourceRot), so the arm never learns that it is one of six: the rotation lives entirely on the target cloud, as a quaternion computed from the point index, \`(0, sin(i*pi/6), 0, cos(i*pi/6))\` — a turn of i*60 degrees about Y, because the figure lies in the ground plane and is read from above. The targets also differ in \`seed\`, which \`pointLine\` hashes from the index: coincident targets sharing a seed too would collapse the six copies of a primitive into one identity, and \`copyToPoints\` names that hazard for exactly this case.\\n\\nThe alternative spelling is six arms with six baked-in angles. It draws the same picture and loses the invariant: the arm becomes six places to edit and nothing enforces they stay equal, so the first asymmetric edit is a bug that looks like a design. But what it buys is narrower than 'six lives in one place', because it does not: the hub count is 6, \`hubTurn\` turns by pi/6, and the arm's own spurs branch by that same pi/6 — three literals that must agree and that nothing checks. What the arm does not know is HOW MANY copies exist: it is built once, in its own frame, and the count belongs to the target cloud alone, so the six can never disagree about their shape however wrong the angle. This makes the arms identical, not the flake correct.\\n\\nA plain line repeated six times would show nothing — a hexagon's worth of spokes is symmetric whatever you do — so the spurs are what make the repetition legible. They branch at 60 degrees, the same 60 that separates the arms, so every spur runs parallel to a neighbouring arm. Ice Ih is hexagonal, basal-plane branching runs along the six equivalent a-directions the lattice provides, and a side branch has no other 60-degree family available. So the six-fold SYMMETRY is inherited from the crystal; whether a flake is a six-armed dendrite at all belongs to the weather, since the same lattice grows needles and columns at other temperatures.\\n\\nThe arm here is authored, not grown. A real flake's arms match because they rode the same parcel of air, not because one was copied — six SIMILAR arms, where this is six identical ones. Making them merely similar is a different graph, not a smaller edit: the arm is finished BEFORE it is stamped, so nothing carried onto the copies afterwards — \`targetNames\`, a per-target seed, a noise at the hub — can reach back and change a spur already placed. That needs \`forEach\` over the hub points. No central plate either, no sub-branching on the spurs (that is \`basics-self-similar-frond\`, which stamps the same rule onto its own output), and no thickness: 15 polylines per arm, 90 in the flake.",\r
    "tags": ["basics", "copy", "symmetry", "paths"]\r
  },\r
  "nodes": [\r
    {\r
      "id": "shaftLine",\r
      "type": "pointLine",\r
      "params": { "mode": "endpoints", "count": 2, "start": [0, 0, 0], "end": [46, 0, 0] }\r
    },\r
    { "id": "shaft", "type": "pointsToPath", "params": { "closed": false } },\r
    {\r
      "id": "spurLine",\r
      "type": "pointLine",\r
      "params": { "mode": "endpoints", "count": 2, "start": [0, 0, 0], "end": [1, 0, 0] }\r
    },\r
    { "id": "spur", "type": "pointsToPath", "params": { "closed": false } },\r
    {\r
      "id": "spurSites",\r
      "type": "pointLine",\r
      "params": { "mode": "endpoints", "count": 14, "start": [0, 0, 0], "end": [1, 0, 0] }\r
    },\r
    {\r
      "id": "station",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "t",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 1,\r
        "value": {\r
          "fn": "div",\r
          "args": [{ "fn": "floor", "args": [{ "fn": "div", "args": [{ "fn": "index" }, 2] }] }, 6]\r
        }\r
      }\r
    },\r
    {\r
      "id": "spurAt",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "P",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 3,\r
        "value": {\r
          "fn": "vec",\r
          "args": [\r
            { "fn": "add", "args": [6, { "fn": "mul", "args": [34, { "fn": "attribute", "name": "t" }] }] },\r
            0,\r
            0\r
          ]\r
        }\r
      }\r
    },\r
    {\r
      "id": "spurSide",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "rot",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 4,\r
        "value": {\r
          "fn": "vec",\r
          "args": [\r
            0,\r
            {\r
              "fn": "mul",\r
              "args": [\r
                {\r
                  "fn": "sub",\r
                  "args": [{ "fn": "mul", "args": [2, { "fn": "mod", "args": [{ "fn": "index" }, 2] }] }, 1]\r
                },\r
                0.5\r
              ]\r
            },\r
            0,\r
            0.8660254037844387\r
          ]\r
        }\r
      }\r
    },\r
    {\r
      "id": "spurLength",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "scale",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 3,\r
        "value": {\r
          "fn": "add",\r
          "args": [\r
            4,\r
            {\r
              "fn": "mul",\r
              "args": [\r
                12,\r
                {\r
                  "fn": "sin",\r
                  "args": [\r
                    { "fn": "mul", "args": [3.141592653589793, { "fn": "attribute", "name": "t" }] }\r
                  ]\r
                }\r
              ]\r
            }\r
          ]\r
        }\r
      }\r
    },\r
    { "id": "spurs", "type": "copyToPoints", "params": { "topology": "keep" } },\r
    { "id": "arm", "type": "mergePrimitives", "params": {} },\r
    {\r
      "id": "hub",\r
      "type": "pointLine",\r
      "params": { "mode": "endpoints", "count": 6, "start": [0, 0, 0], "end": [0, 0, 0] }\r
    },\r
    {\r
      "id": "hubTurn",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "rot",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 4,\r
        "value": {\r
          "fn": "vec",\r
          "args": [\r
            0,\r
            {\r
              "fn": "sin",\r
              "args": [{ "fn": "mul", "args": [{ "fn": "index" }, 0.5235987755982988] }]\r
            },\r
            0,\r
            {\r
              "fn": "cos",\r
              "args": [{ "fn": "mul", "args": [{ "fn": "index" }, 0.5235987755982988] }]\r
            }\r
          ]\r
        }\r
      }\r
    },\r
    { "id": "flake", "type": "copyToPoints", "params": { "topology": "keep" } }\r
  ],\r
  "connections": [\r
    { "from": ["shaftLine", "out"], "to": ["shaft", "in"] },\r
    { "from": ["spurLine", "out"], "to": ["spur", "in"] },\r
    { "from": ["spurSites", "out"], "to": ["station", "in"] },\r
    { "from": ["station", "out"], "to": ["spurAt", "in"] },\r
    { "from": ["spurAt", "out"], "to": ["spurSide", "in"] },\r
    { "from": ["spurSide", "out"], "to": ["spurLength", "in"] },\r
    { "from": ["spur", "out"], "to": ["spurs", "source"] },\r
    { "from": ["spurLength", "out"], "to": ["spurs", "target"] },\r
    { "from": ["shaft", "out"], "to": ["arm", "in"] },\r
    { "from": ["spurs", "out"], "to": ["arm", "in"] },\r
    { "from": ["hub", "out"], "to": ["hubTurn", "in"] },\r
    { "from": ["arm", "out"], "to": ["flake", "source"] },\r
    { "from": ["hubTurn", "out"], "to": ["flake", "target"] }\r
  ],\r
  "outputs": [{ "id": "flake", "pin": "out", "name": "flake" }]\r
}\r
`;export{e as default};