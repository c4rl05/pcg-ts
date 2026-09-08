var e=`{\r
  "formatVersion": 1,\r
  "seed": 1101,\r
  "meta": {\r
    "title": "the golden angle packs a disc",\r
    "description": "Layout computed from the point's own INDEX rather than drawn from a noise or a scatter: point i sits at angle \`i * a\` and radius \`c * sqrt(i)\`, which is the arrangement a sunflower head, a pinecone and a succulent all use. The sqrt is what makes it a packing rather than a spiral — equal area per point, so the density is the same at the rim as at the centre — and the ANGLE is what makes it uniform. Both arms here run the identical expression and differ only in \`a\`. On the left \`a\` is the golden angle, 2.3999632, which is 2*pi times an irrational number: no point ever lands on a previous one's ray, so the florets interleave and the eye reads the two families of counter-rotating arcs nobody placed. On the right \`a\` is 2*pi/8, a RATIONAL turn, and every eighth point shares a ray: the same sqrt spacing collapses into eight spokes with wedges of nothing between them. That is the whole lesson — the packing comes from the angle being incommensurable with a full turn, not from the radius law, which both arms share. Distinct from the shipped \`shape/spiral\` primitive, which is Archimedean and evenly spaced in ANGLE: that draws one winding curve, this fills an area. Positions are overwritten wholesale, so the source only has to supply the right NUMBER of points and an index to read; a \`pointLine\` is the cheapest thing that does. Nothing here writes \`scale\` — a bare cloud draws every point the same size whatever \`scale\` says, and a column the renderer ignores would be a graph claiming something it does not show."\r
    ,\r
    "tags": ["basics", "fields", "layout"]\r
  },\r
  "nodes": [\r
    {\r
      "id": "row",\r
      "type": "pointLine",\r
      "params": { "mode": "endpoints", "count": 800, "start": [0, 0, 0], "end": [1, 0, 0] }\r
    },\r
    {\r
      "id": "golden",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "P",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 3,\r
        "value": {\r
          "fn": "vec",\r
          "args": [\r
            {\r
              "fn": "mul",\r
              "args": [\r
                { "fn": "mul", "args": [1.6, { "fn": "sqrt", "args": [{ "fn": "index" }] }] },\r
                { "fn": "cos", "args": [{ "fn": "mul", "args": [{ "fn": "index" }, 2.399963229728653] }] }\r
              ]\r
            },\r
            0,\r
            {\r
              "fn": "mul",\r
              "args": [\r
                { "fn": "mul", "args": [1.6, { "fn": "sqrt", "args": [{ "fn": "index" }] }] },\r
                { "fn": "sin", "args": [{ "fn": "mul", "args": [{ "fn": "index" }, 2.399963229728653] }] }\r
              ]\r
            }\r
          ]\r
        }\r
      }\r
    },\r
    {\r
      "id": "goldenAt",\r
      "type": "transformPoints",\r
      "params": { "translate": [-55, 0, 0] }\r
    },\r
    {\r
      "id": "spokes",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "P",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 3,\r
        "value": {\r
          "fn": "vec",\r
          "args": [\r
            {\r
              "fn": "mul",\r
              "args": [\r
                { "fn": "mul", "args": [1.6, { "fn": "sqrt", "args": [{ "fn": "index" }] }] },\r
                { "fn": "cos", "args": [{ "fn": "mul", "args": [{ "fn": "index" }, 0.7853981633974483] }] }\r
              ]\r
            },\r
            0,\r
            {\r
              "fn": "mul",\r
              "args": [\r
                { "fn": "mul", "args": [1.6, { "fn": "sqrt", "args": [{ "fn": "index" }] }] },\r
                { "fn": "sin", "args": [{ "fn": "mul", "args": [{ "fn": "index" }, 0.7853981633974483] }] }\r
              ]\r
            }\r
          ]\r
        }\r
      }\r
    },\r
    {\r
      "id": "spokesAt",\r
      "type": "transformPoints",\r
      "params": { "translate": [55, 0, 0] }\r
    },\r
    { "id": "both", "type": "mergePoints", "params": {} }\r
  ],\r
  "connections": [\r
    { "from": ["row", "out"], "to": ["golden", "in"] },\r
    { "from": ["golden", "out"], "to": ["goldenAt", "in"] },\r
    { "from": ["row", "out"], "to": ["spokes", "in"] },\r
    { "from": ["spokes", "out"], "to": ["spokesAt", "in"] },\r
    { "from": ["goldenAt", "out"], "to": ["both", "in"] },\r
    { "from": ["spokesAt", "out"], "to": ["both", "in"] }\r
  ],\r
  "outputs": [{ "id": "both", "pin": "out", "name": "points" }]\r
}\r
`;export{e as default};