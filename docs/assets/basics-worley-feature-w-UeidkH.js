var e=`{\r
  "formatVersion": 1,\r
  "seed": 5501,\r
  "meta": {\r
    "title": "draw the answer: every point reaches for its own cell",\r
    "description": "\`worleyNoise\` answers questions ABOUT the nearest feature point — how far it is (\`f1\`), how much nearer than the runner-up (\`f2-f1\`), which cell won (\`cell\`). Every one of those is a measurement, and a measurement cannot tell you WHERE anything is. \`worleyFeature\` returns the point itself, as a tuple-3 world position, and this graph draws it literally: one segment from each grid point to the feature point it belongs to, so the field is a picture rather than a claim. The starbursts ARE the Voronoi cells, and their centres are the feature points the distances have always been measured from. IT COMES BACK IN THE SAMPLED SPACE, which is world space here and in any graph that does not set \`opts.position\`, and no other noise value has a space at all: a point in the noise's internal coordinates would be useless to the caller, so \`frequency\` and \`offset\` are undone before the value is stored and \`sub(worleyFeature, position)\` is a vector in the units this graph is written in. Two edges follow from the inverse being only that: \`frequency: 0\` is refused, because a map that sends all of space to one point has none, and scaling the sampled POSITION — the substitution the grammar recommends when it refuses a field-valued frequency — is unavailable here, since the inverse cannot undo an arbitrary expression. That vector is the whole point — feed it to \`orientAlongVector\` and a field of scales, shingles or cracked plates all face their own cell centre, which no distance output can express. The pairing trick here is worth stealing: \`pairId\` is written as \`index()\` on the ONE cloud that both branches fan out from, so a point and its snapped copy carry the same id into the merge, and \`pointsToPath\` groups them back into one two-point polyline each. Nothing has to know how many points there were. \`exact\` defaults to TRUE for this output, as it does for \`cell\`, and the reason is measurable: one feature per cell means a feature the cheap 3x3x3 walk missed is in a DIFFERENT cell, so a missed f1 and a changed winner are the same event. About 7e-5 of corner-adjacent queries hit it, and when they do the answer moves a whole cell — some 1.6 world units in the case pinned in the tests — where a distance output would have been wrong by about 0.016.",\r
    "tags": ["basics", "fields", "noise", "voronoi", "topology"]\r
  },\r
  "nodes": [\r
    {\r
      "id": "grid",\r
      "type": "pointGrid",\r
      "params": {\r
        "countX": 46,\r
        "countY": 1,\r
        "countZ": 46,\r
        "spacing": [0.62, 1, 0.62],\r
        "origin": [-14, 0, -14]\r
      }\r
    },\r
    {\r
      "id": "pairId",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "pairId",\r
        "domain": "point",\r
        "type": "u32",\r
        "tupleSize": 1,\r
        "value": { "fn": "index" }\r
      }\r
    },\r
    {\r
      "id": "snap",\r
      "type": "transformPoints",\r
      "params": {\r
        "translate": {\r
          "fn": "sub",\r
          "args": [\r
            {\r
              "fn": "worleyFeature",\r
              "opts": { "seed": { "from": "node", "variant": 0 }, "frequency": 0.17 }\r
            },\r
            { "fn": "position" }\r
          ]\r
        }\r
      }\r
    },\r
    { "id": "both", "type": "mergePoints", "params": {} },\r
    {\r
      "id": "reach",\r
      "type": "pointsToPath",\r
      "params": { "groupAttr": "pairId", "closed": false }\r
    }\r
  ],\r
  "connections": [\r
    { "from": ["grid", "out"], "to": ["pairId", "in"] },\r
    { "from": ["pairId", "out"], "to": ["snap", "in"] },\r
    { "from": ["pairId", "out"], "to": ["both", "in"] },\r
    { "from": ["snap", "out"], "to": ["both", "in"] },\r
    { "from": ["both", "out"], "to": ["reach", "in"] }\r
  ],\r
  "outputs": [{ "id": "reach", "pin": "out", "name": "reach" }]\r
}\r
`;export{e as default};