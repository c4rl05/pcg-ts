var e=`{\r
  "formatVersion": 1,\r
  "seed": 1091,\r
  "meta": {\r
    "title": "colour and lift a Voronoi cell",\r
    "description": "\`worleyNoise\` normally answers a DISTANCE — how far the sample is from the nearest feature point. \`output: \\"cell\\"\` answers WHICH cell won instead, as a hash in [0, 1) that is the same value everywhere inside one cell. That is the difference between describing a position within the partition and addressing the partition itself: \`plate\` here drives both the tint and a per-plate height, and no distance output can hold one plate flat while its neighbour sits higher, because no distance is constant anywhere. The cracks are the other half of the same diagram — \`f2-f1\` is small exactly where two features are equidistant, which is the cell border, so dropping the points below a threshold opens the gaps. THE TWO OUTPUTS ARE COMPUTED IN ONE NODE, as the two lanes of a tuple-2 attribute, and that is load-bearing rather than tidy: \`seed: { from: \\"node\\" }\` derives from the COOKING NODE's seed, so the same spec in two different \`setAttribute\` nodes is two different diagrams and the cracks would cut across the plates instead of outlining them. One node, one seed, one diagram; \`component\` takes the lanes back apart. Two more things worth knowing: \`cell\` defaults \`exact\` to true, because a missed feature costs a distance about 0.016 and costs a cell hash a wholly unrelated value; and it is the one noise output that does not lower to WGSL, so it resolves on the CPU with a \`compile-error\` fallback rather than being approximated. Its reach is bounded by construction — one feature per unit cell over a fixed search — so unlike Voronoi over an arbitrary point set it is partition-invariant under a \`World\` at any cell size, and needs no halo.",\r
    "tags": ["basics", "fields", "noise", "attributes", "voronoi"]\r
  },\r
  "nodes": [\r
    {\r
      "id": "ground",\r
      "type": "pointGrid",\r
      "params": {\r
        "countX": 150,\r
        "countY": 1,\r
        "countZ": 150,\r
        "spacing": [0.36, 1, 0.36],\r
        "origin": [-27, 0, -27]\r
      }\r
    },\r
    {\r
      "id": "cells",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "cells",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 2,\r
        "value": {\r
          "fn": "vec",\r
          "args": [\r
            {\r
              "fn": "worleyNoise",\r
              "opts": {\r
                "seed": { "from": "node", "variant": 0 },\r
                "frequency": 0.11,\r
                "output": "cell",\r
                "position": { "fn": "position" }\r
              }\r
            },\r
            {\r
              "fn": "worleyNoise",\r
              "opts": {\r
                "seed": { "from": "node", "variant": 0 },\r
                "frequency": 0.11,\r
                "output": "f2-f1",\r
                "position": { "fn": "position" }\r
              }\r
            }\r
          ]\r
        }\r
      }\r
    },\r
    {\r
      "id": "crack",\r
      "type": "filterByExpression",\r
      "params": {\r
        "predicate": {\r
          "fn": "step",\r
          "args": [\r
            0.055,\r
            { "fn": "component", "args": [{ "fn": "attribute", "name": "cells" }], "index": 1 }\r
          ]\r
        }\r
      }\r
    },\r
    {\r
      "id": "heave",\r
      "type": "transformPoints",\r
      "params": {\r
        "translate": {\r
          "fn": "vec",\r
          "args": [\r
            0,\r
            {\r
              "fn": "mul",\r
              "args": [\r
                { "fn": "component", "args": [{ "fn": "attribute", "name": "cells" }], "index": 0 },\r
                4.5\r
              ]\r
            },\r
            0\r
          ]\r
        }\r
      }\r
    },\r
    {\r
      "id": "tint",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "color",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 3,\r
        "value": {\r
          "fn": "vec",\r
          "args": [\r
            {\r
              "fn": "add",\r
              "args": [\r
                0.28,\r
                {\r
                  "fn": "mul",\r
                  "args": [\r
                    {\r
                      "fn": "component",\r
                      "args": [{ "fn": "attribute", "name": "cells" }],\r
                      "index": 0\r
                    },\r
                    0.62\r
                  ]\r
                }\r
              ]\r
            },\r
            {\r
              "fn": "add",\r
              "args": [\r
                0.11,\r
                {\r
                  "fn": "mul",\r
                  "args": [\r
                    {\r
                      "fn": "fract",\r
                      "args": [\r
                        {\r
                          "fn": "mul",\r
                          "args": [\r
                            {\r
                              "fn": "component",\r
                              "args": [{ "fn": "attribute", "name": "cells" }],\r
                              "index": 0\r
                            },\r
                            3.7\r
                          ]\r
                        }\r
                      ]\r
                    },\r
                    0.4\r
                  ]\r
                }\r
              ]\r
            },\r
            {\r
              "fn": "add",\r
              "args": [\r
                0.04,\r
                {\r
                  "fn": "mul",\r
                  "args": [\r
                    {\r
                      "fn": "fract",\r
                      "args": [\r
                        {\r
                          "fn": "mul",\r
                          "args": [\r
                            {\r
                              "fn": "component",\r
                              "args": [{ "fn": "attribute", "name": "cells" }],\r
                              "index": 0\r
                            },\r
                            7.1\r
                          ]\r
                        }\r
                      ]\r
                    },\r
                    0.16\r
                  ]\r
                }\r
              ]\r
            }\r
          ]\r
        }\r
      }\r
    }\r
  ],\r
  "connections": [\r
    { "from": ["ground", "out"], "to": ["cells", "in"] },\r
    { "from": ["cells", "out"], "to": ["crack", "in"] },\r
    { "from": ["crack", "out"], "to": ["heave", "in"] },\r
    { "from": ["heave", "out"], "to": ["tint", "in"] }\r
  ],\r
  "outputs": [{ "id": "tint", "pin": "out", "name": "points" }]\r
}\r
`;export{e as default};