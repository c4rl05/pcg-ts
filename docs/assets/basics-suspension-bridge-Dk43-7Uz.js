var e=`{\r
  "formatVersion": 1,\r
  "seed": 1105,\r
  "meta": {\r
    "title": "The cable sets every hanger",\r
    "description": "A suspension bridge is the clearest case of a DERIVED quantity: a hanger is not a design decision, it is a subtraction. One row of 65 stations spans the gap, \`cableY\` and \`deckY\` are each written once on it as a scalar attribute, and below that row no height is typed in again. Each hanger's length is \`cableY - deckY\` at its own station and each tower's is \`cableY\` measured from its own foot, so moving the sag moves all 31 hangers AND both towers, and nothing can disagree with the curve it hangs from. The alternative is a table of lengths, correct exactly once and wrong the moment anything upstream moves — silently, because a wrong-length hanger is still a valid line. An earlier draft made that mistake in miniature: the towers were a \`pointLine\` with a literal scale of 39, which is \`cableY(80) + 6\` by hand. It validated, cooked and rendered pixel for pixel the same; nothing would have reported it until the sag changed.\\n\\nThe curve is a PARABOLA, \`5 + 0.004375 * x^2\`, and catenary would be the wrong word for the right shape. A catenary — \`cosh\` — is what a chain takes under its own weight, uniform along the CURVE. A main cable is loaded by the deck through the hangers, and that load is uniform along the HORIZONTAL, which integrates to a parabola. So the parabola is not a stand-in: for a deck-dominated cable it is the exact answer, and the catenary is the case with no bridge hanging off it. (A real cable has weight of its own, so the true shape lies between the two; parabolic is a limit, not an identity.) The grammar has no \`cosh\` — run \`pcg fields\` for the catalogue — but it has \`exp\`, so the unloaded curve \`a * (cosh(x/a) - 1)\` is two \`exp\` calls away. Matched to the same towers and the same 28-unit sag, which needs a = 118.7, the two part by 0.26 units at x = 57: under one percent of the sag, worth stating in words and not worth spending nodes on.\\n\\nThe deck is not flat: a camber of 2.5 at mid-span falling to 0 at the towers makes the subtraction a real difference of two heights rather than the cable height renamed, which a flat deck would have let the graph pretend.\\n\\nHangers and towers are the SAME primitive: one two-point unit segment to (0, 1, 0), stamped by \`copyToPoints\` onto targets carrying a \`scale\` the copy multiplies into the source before placing it. They differ in which stations they stand on and how far below the deck their foot sits: the hanger stands on the deck and takes \`cableY - deckY\`, the tower drops 6 and takes \`cableY\` minus its own \`P.y\`, the same sentence measured from a lower foot. Both site lists are filters on \`index\` over the one station row — every second station minus the two ends for the hangers, exactly those ends for the towers — not second \`pointLine\`s, which would restate the span and drift.\\n\\nWhat this does not do: it is an ELEVATION, one cable plane at z = 0, so the top view is a single line by construction. Two cables with the deck slung between them, backstays to an anchorage, a tower that is a frame rather than a stroke — each is more geometry, none is more mechanism.",\r
    "tags": ["basics", "fields", "attributes", "copy", "paths"]\r
  },\r
  "nodes": [\r
    {\r
      "id": "stations",\r
      "type": "pointLine",\r
      "params": { "mode": "endpoints", "count": 65, "start": [-80, 0, 0], "end": [80, 0, 0] }\r
    },\r
    {\r
      "id": "cableY",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "cableY",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 1,\r
        "value": {\r
          "fn": "add",\r
          "args": [\r
            5,\r
            {\r
              "fn": "mul",\r
              "args": [\r
                0.004375,\r
                {\r
                  "fn": "mul",\r
                  "args": [\r
                    { "fn": "component", "args": [{ "fn": "position" }], "index": 0 },\r
                    { "fn": "component", "args": [{ "fn": "position" }], "index": 0 }\r
                  ]\r
                }\r
              ]\r
            }\r
          ]\r
        }\r
      }\r
    },\r
    {\r
      "id": "deckY",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "deckY",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 1,\r
        "value": {\r
          "fn": "sub",\r
          "args": [\r
            2.5,\r
            {\r
              "fn": "mul",\r
              "args": [\r
                0.000390625,\r
                {\r
                  "fn": "mul",\r
                  "args": [\r
                    { "fn": "component", "args": [{ "fn": "position" }], "index": 0 },\r
                    { "fn": "component", "args": [{ "fn": "position" }], "index": 0 }\r
                  ]\r
                }\r
              ]\r
            }\r
          ]\r
        }\r
      }\r
    },\r
    {\r
      "id": "cablePts",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "P",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 3,\r
        "value": {\r
          "fn": "vec",\r
          "args": [\r
            { "fn": "component", "args": [{ "fn": "position" }], "index": 0 },\r
            { "fn": "attribute", "name": "cableY" },\r
            0\r
          ]\r
        }\r
      }\r
    },\r
    { "id": "cable", "type": "pointsToPath", "params": { "closed": false } },\r
    {\r
      "id": "deckPts",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "P",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 3,\r
        "value": {\r
          "fn": "vec",\r
          "args": [\r
            { "fn": "component", "args": [{ "fn": "position" }], "index": 0 },\r
            { "fn": "attribute", "name": "deckY" },\r
            0\r
          ]\r
        }\r
      }\r
    },\r
    { "id": "deck", "type": "pointsToPath", "params": { "closed": false } },\r
    {\r
      "id": "hangerSites",\r
      "type": "filterByExpression",\r
      "params": {\r
        "predicate": {\r
          "fn": "mul",\r
          "args": [\r
            {\r
              "fn": "mul",\r
              "args": [\r
                { "fn": "eq", "args": [{ "fn": "mod", "args": [{ "fn": "index" }, 2] }, 0] },\r
                { "fn": "gt", "args": [{ "fn": "index" }, 0] }\r
              ]\r
            },\r
            { "fn": "lt", "args": [{ "fn": "index" }, 64] }\r
          ]\r
        }\r
      }\r
    },\r
    {\r
      "id": "hangerScale",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "scale",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 3,\r
        "value": {\r
          "fn": "vec",\r
          "args": [\r
            1,\r
            {\r
              "fn": "sub",\r
              "args": [\r
                { "fn": "attribute", "name": "cableY" },\r
                { "fn": "attribute", "name": "deckY" }\r
              ]\r
            },\r
            1\r
          ]\r
        }\r
      }\r
    },\r
    {\r
      "id": "riserLine",\r
      "type": "pointLine",\r
      "params": { "mode": "endpoints", "count": 2, "start": [0, 0, 0], "end": [0, 1, 0] }\r
    },\r
    { "id": "riser", "type": "pointsToPath", "params": { "closed": false } },\r
    { "id": "hangers", "type": "copyToPoints", "params": { "topology": "keep" } },\r
    {\r
      "id": "towerSites",\r
      "type": "filterByExpression",\r
      "params": {\r
        "predicate": {\r
          "fn": "max",\r
          "args": [\r
            { "fn": "eq", "args": [{ "fn": "index" }, 0] },\r
            { "fn": "eq", "args": [{ "fn": "index" }, 64] }\r
          ]\r
        }\r
      }\r
    },\r
    {\r
      "id": "towerFoot",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "P",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 3,\r
        "value": {\r
          "fn": "vec",\r
          "args": [\r
            { "fn": "component", "args": [{ "fn": "position" }], "index": 0 },\r
            { "fn": "sub", "args": [{ "fn": "attribute", "name": "deckY" }, 6] },\r
            0\r
          ]\r
        }\r
      }\r
    },\r
    {\r
      "id": "towerScale",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "scale",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 3,\r
        "value": {\r
          "fn": "vec",\r
          "args": [\r
            1,\r
            {\r
              "fn": "sub",\r
              "args": [\r
                { "fn": "attribute", "name": "cableY" },\r
                { "fn": "component", "args": [{ "fn": "position" }], "index": 1 }\r
              ]\r
            },\r
            1\r
          ]\r
        }\r
      }\r
    },\r
    { "id": "towers", "type": "copyToPoints", "params": { "topology": "keep" } },\r
    { "id": "bridge", "type": "mergePrimitives", "params": {} }\r
  ],\r
  "connections": [\r
    { "from": ["stations", "out"], "to": ["cableY", "in"] },\r
    { "from": ["cableY", "out"], "to": ["deckY", "in"] },\r
    { "from": ["deckY", "out"], "to": ["cablePts", "in"] },\r
    { "from": ["cablePts", "out"], "to": ["cable", "in"] },\r
    { "from": ["deckY", "out"], "to": ["deckPts", "in"] },\r
    { "from": ["deckPts", "out"], "to": ["deck", "in"] },\r
    { "from": ["deckPts", "out"], "to": ["hangerSites", "in"] },\r
    { "from": ["hangerSites", "out"], "to": ["hangerScale", "in"] },\r
    { "from": ["riserLine", "out"], "to": ["riser", "in"] },\r
    { "from": ["riser", "out"], "to": ["hangers", "source"] },\r
    { "from": ["hangerScale", "out"], "to": ["hangers", "target"] },\r
    { "from": ["deckPts", "out"], "to": ["towerSites", "in"] },\r
    { "from": ["towerSites", "out"], "to": ["towerFoot", "in"] },\r
    { "from": ["towerFoot", "out"], "to": ["towerScale", "in"] },\r
    { "from": ["riser", "out"], "to": ["towers", "source"] },\r
    { "from": ["towerScale", "out"], "to": ["towers", "target"] },\r
    { "from": ["deck", "out"], "to": ["bridge", "in"] },\r
    { "from": ["cable", "out"], "to": ["bridge", "in"] },\r
    { "from": ["hangers", "out"], "to": ["bridge", "in"] },\r
    { "from": ["towers", "out"], "to": ["bridge", "in"] }\r
  ],\r
  "outputs": [{ "id": "bridge", "pin": "out", "name": "bridge" }]\r
}\r
`;export{e as default};