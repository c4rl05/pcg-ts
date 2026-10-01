var e=`{\r
  "formatVersion": 1,\r
  "seed": 1102,\r
  "meta": {\r
    "title": "A frond made of smaller fronds",\r
    "description": "Self-similarity WITHOUT recursion, which this library does not have: a subgraph may not reference itself, so a structure whose parts are smaller copies of the whole is spelled by applying one rule a fixed number of times and reading the unrolled result. The rule is \`copyToPoints\`, and what makes it a rule rather than a stamp is that it COMPOSES TRANSFORMS: a copy lands at \`targetP + targetRot * (targetScale * sourceP)\`, takes \`targetRot * sourceRot\`, and multiplies the scales. So a template carrying a per-point \`rot\` and a tapering \`scale\` is not decoration — it IS the production, and every point of the parent says where its child goes, which way it points and how much smaller it is. Here one template does all three levels. \`rachis\` is twenty points along a line; \`scale\` tapers them base to tip, and \`rot\` turns alternate points to alternate sides, so the template describes both a stem AND the placement of whatever is stamped on it. Stamping the template onto ITSELF gives the pinnae, stamping that result onto the template again gives the pinnules, and \`topology: \\"keep\\"\` re-emits the source polyline once per target so each copy arrives as a path rather than a loose cloud. Three levels is a choice, not a limit: a fourth is one more node and one more multiply on the count. The compounding is the point — a level-2 leaflet carries the product of two turns and two tapers, which is why the outline curves although nothing here computes a curve. What this graph cannot do is stop when the parts get small enough, or branch a different number of times at different places; that wants a loop with a settle condition rather than a fixed chain, and \`basics-repeat-until-settled\` is where that lives."\r
    ,\r
    "tags": ["basics", "copy", "structure", "paths"]\r
  },\r
  "nodes": [\r
    {\r
      "id": "rachis",\r
      "type": "pointLine",\r
      "params": { "mode": "endpoints", "count": 20, "start": [0, 0, 0], "end": [10, 0, 0] }\r
    },\r
    {\r
      "id": "taper",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "scale",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 3,\r
        "value": { "fn": "sub", "args": [0.5, { "fn": "mul", "args": [0.36, { "fn": "fraction" }] }] }\r
      }\r
    },\r
    {\r
      "id": "tilt",\r
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
                { "fn": "sub", "args": [{ "fn": "mul", "args": [2, { "fn": "mod", "args": [{ "fn": "index" }, 2] }] }, 1] },\r
                0.34202014332\r
              ]\r
            },\r
            0,\r
            0.93969262078\r
          ]\r
        }\r
      }\r
    },\r
    { "id": "unit", "type": "pointsToPath", "params": { "closed": false } },\r
    {\r
      "id": "pinnae",\r
      "type": "copyToPoints",\r
      "params": { "topology": "keep" }\r
    },\r
    {\r
      "id": "pinnules",\r
      "type": "copyToPoints",\r
      "params": { "topology": "keep" }\r
    },\r
    { "id": "frond", "type": "mergePrimitives", "params": {} }\r
  ],\r
  "connections": [\r
    { "from": ["rachis", "out"], "to": ["taper", "in"] },\r
    { "from": ["taper", "out"], "to": ["tilt", "in"] },\r
    { "from": ["tilt", "out"], "to": ["unit", "in"] },\r
    { "from": ["unit", "out"], "to": ["pinnae", "source"] },\r
    { "from": ["unit", "out"], "to": ["pinnae", "target"] },\r
    { "from": ["unit", "out"], "to": ["pinnules", "source"] },\r
    { "from": ["pinnae", "out"], "to": ["pinnules", "target"] },\r
    { "from": ["unit", "out"], "to": ["frond", "in"] },\r
    { "from": ["pinnae", "out"], "to": ["frond", "in"] },\r
    { "from": ["pinnules", "out"], "to": ["frond", "in"] }\r
  ],\r
  "outputs": [{ "id": "frond", "pin": "out", "name": "frond" }]\r
}\r
`;export{e as default};