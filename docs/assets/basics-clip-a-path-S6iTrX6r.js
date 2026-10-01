var e=`{\r
  "formatVersion": 1,\r
  "seed": 1101,\r
  "meta": {\r
    "title": "Cut a path where a field goes negative",\r
    "description": "\`pathClip\` changes a path's TOPOLOGY by value: it resolves \`field\` at every vertex, keeps the stretches where it is >= 0, and cuts the polyline at the place the value crosses zero rather than at the nearest vertex, so each kept piece comes out as a polyline of its own that ends ON the boundary. Here the field is a noise less a threshold, so the ring is kept only where the noise runs high. The ring is CLOSED, and a closed path cut anywhere comes back as OPEN runs — a piece that straddles the ring's first point is one run, not two, because the closing segment is an ordinary segment of the ring. A segment whose two ends agree is never searched, so a sign change that dips between two vertices is invisible: that is why \`pathResample\` samples the curve densely first — the resolution of the cut is the resolution of the sampling. \`minLength\` drops the stubs a boundary leaves where it only grazes the path. The cut points are new points: they carry P from the root search, f32 columns lerped across their segment, and a seed of their own. \`arcAttr\` writes each point's distance from the start of ITS OWN piece — it restarts at 0 at every cut — and the tubes read it, so every piece starts thin where it was cut and swells to its full radius a few units in. \`runIndexAttr\` and \`lengthAttr\` report which piece of its source path a run is and how long it came out.",\r
    "tags": ["basics", "path", "curve", "topology", "fields"]\r
  },\r
  "nodes": [\r
    {\r
      "id": "curve",\r
      "type": "subgraph",\r
      "params": { "count": 64, "size": [16, 16, 16] },\r
      "ref": { "name": "shape/path-loop" }\r
    },\r
    {\r
      "id": "dense",\r
      "type": "pathResample",\r
      "params": { "mode": "count", "count": 400 }\r
    },\r
    {\r
      "id": "clip",\r
      "type": "pathClip",\r
      "params": {\r
        "field": {\r
          "fn": "sub",\r
          "args": [\r
            {\r
              "fn": "perlinNoise",\r
              "opts": {\r
                "frequency": 0.12,\r
                "seed": { "from": "node", "variant": 2 },\r
                "normalized": true,\r
                "position": { "fn": "position" }\r
              }\r
            },\r
            0.48\r
          ]\r
        },\r
        "minLength": 1.5,\r
        "runIndexAttr": "piece",\r
        "lengthAttr": "pieceLength",\r
        "arcAttr": "along"\r
      }\r
    },\r
    {\r
      "id": "tube",\r
      "type": "sweepProfile",\r
      "params": {\r
        "profile": "circle",\r
        "sides": 10,\r
        "radius": {\r
          "fn": "min",\r
          "args": [\r
            0.5,\r
            { "fn": "add", "args": [0.12, { "fn": "mul", "args": [0.15, { "fn": "attribute", "name": "along" }] }] }\r
          ]\r
        },\r
        "caps": true\r
      }\r
    }\r
  ],\r
  "connections": [\r
    { "from": ["curve", "out"], "to": ["dense", "in"] },\r
    { "from": ["dense", "out"], "to": ["clip", "in"] },\r
    { "from": ["clip", "out"], "to": ["tube", "in"] }\r
  ],\r
  "outputs": [\r
    { "id": "tube", "pin": "out", "name": "kept" },\r
    { "id": "dense", "pin": "out", "name": "path" }\r
  ]\r
}\r
`;export{e as default};