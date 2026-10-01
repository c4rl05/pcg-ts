var e=`{\r
  "formatVersion": 1,\r
  "seed": 2202,\r
  "meta": {\r
    "title": "A dendrite grown by aggregation",\r
    "description": "AGGREGATION, which is the shape \`pointsToPath\` cannot describe and \`connectByIndex\` exists for. A seed point sits at the origin and a fixed cloud of candidates fills the box around it. Each round every candidate asks the structure so far for its nearest member; the ones within 1.2 units of it join, each REMEMBERING THE INDEX it was answered with, and the structure grows outward one shell at a time until no candidate is close enough to anything. What comes out is a parent pointer per point, and \`connectByIndex\` turns that column into the edges -- one 2-vertex polyline per point, from the point to the point it stuck to. Every link is its own edge and there are no linear runs to group by, so no assignment of \`pointsToPath\` group keys reaches this: its groups are vertex-disjoint chains, and a point three candidates chose would have to appear in three of them. THE INDEX SURVIVES THE ROUNDS, and that is the one thing this graph has to get right. An index is an ORDINAL, so a pointer is only worth keeping while nothing renumbers what it points into. \`mergePoints\` concatenates in connection order, existing points first, so the structure's own indices never move and a pointer written in round 3 still names the same point in round 20. Attach the new points the other way round and every pointer in the structure would silently shift by however many joined that round -- the edges would still build, and they would be wrong. The two nodes meet on a convention rather than on a wire: \`sampleNearestPoint\` writes -1 when it finds nothing and \`connectByIndex\` reads -1 as a root by default, so an unanswered point comes out as a point with no parent rather than as an error. THIS GRAPH NEVER EXERCISES THAT: \`maxDistance\` 0 means unlimited and the structure is never empty, so every candidate is answered and the only -1 in the cook is the seed's own, written before the loop. The convention still matters, because it is what lets a bounded reach be dropped in later without a second node to translate the sentinel. THE EPSILON IS NOT A TOLERANCE, it is what keeps a candidate from attaching twice: once a candidate has joined, the structure contains a point at exactly its position, so its nearest distance is 0 on every later round. Asking for a distance strictly ABOVE zero excludes the copy of itself, which is cheaper and more exact than carrying a used flag through the loop on a cloud that is broadcast fresh every round. WHY THE CANDIDATES ARE FIXED rather than drawn per round: \`repeatUntil\` does not rotate its seed, by design, so a scatter inside the body would draw the IDENTICAL cloud every round and the structure would see the same candidates forever. Randomness inside a growth loop has to come from the DATA changing, not from the seed moving -- here the structure grows, so different candidates come within reach each round from the same fixed cloud. It settles when a round attaches nothing, counted by summing a 0/1 \`fresh\` flag into the detail domain; mode \`count\` would report the element count and ignore the attribute, and over a structure that only grows it would never reach zero. THE STICK RADIUS IS MEASURED AGAINST THE CANDIDATE SPACING and is not a number to pick in world units, which took two failed cooks to learn. BELOW the mean spacing nothing propagates past the first ring: at 2.7 against a spacing of 2.86 this graph settled at THREE POINTS, because the points that joined had no unclaimed neighbour inside their own reach. Comfortably ABOVE it every candidate is already within reach of something on the first round and the entire cloud aggregates at once: at 2.4 against a spacing of 1.47, all 20,000 attached and the edge set was a solid hairball rather than a dendrite. What is shown here is the narrow band just above the spacing -- 1.2 against 0.8. It is PLANAR for the same reason: the identical rule in a 3D box draws as a ball of wire, and nothing about the mechanism needs the third dimension to be seen. One more thing this model does NOT have, and the description should not pretend otherwise: screening. Real diffusion-limited aggregation attaches one walker at a time, so tips shadow the interior and grow faster. Here every candidate is answered simultaneously, so what grows is a shell at a time and the branching comes from which neighbour was nearest, not from a race.",\r
    "tags": [\r
      "examples",\r
      "growth",\r
      "topology",\r
      "repeat"\r
    ]\r
  },\r
  "nodes": [\r
    {\r
      "id": "seedPt",\r
      "type": "pointLine",\r
      "params": {\r
        "mode": "endpoints",\r
        "count": 1,\r
        "start": [\r
          0,\r
          0,\r
          0\r
        ],\r
        "end": [\r
          0,\r
          0,\r
          0\r
        ]\r
      }\r
    },\r
    {\r
      "id": "seedParent",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "parent",\r
        "domain": "point",\r
        "type": "i32",\r
        "tupleSize": 1,\r
        "value": -1,\r
        "select": 0,\r
        "values": [],\r
        "weights": [],\r
        "stringValue": "",\r
        "seed": 0\r
      }\r
    },\r
    {\r
      "id": "candidates",\r
      "type": "pointScatterInBounds",\r
      "params": {\r
        "count": 2500,\r
        "boundsMin": [\r
          -20,\r
          0,\r
          -20\r
        ],\r
        "boundsMax": [\r
          20,\r
          0,\r
          20\r
        ]\r
      }\r
    },\r
    {\r
      "id": "grow",\r
      "type": "repeatUntil",\r
      "params": {\r
        "maxRounds": 60,\r
        "settleAttr": "moves"\r
      },\r
      "subgraph": {\r
        "graph": {\r
          "formatVersion": 1,\r
          "seed": 0,\r
          "nodes": [\r
            {\r
              "id": "pass",\r
              "type": "transformPoints",\r
              "params": {\r
                "translate": [\r
                  0,\r
                  0,\r
                  0\r
                ],\r
                "rotateEuler": [\r
                  0,\r
                  0,\r
                  0\r
                ],\r
                "scale": [\r
                  1,\r
                  1,\r
                  1\r
                ]\r
              }\r
            },\r
            {\r
              "id": "near",\r
              "type": "sampleNearestPoint",\r
              "params": {\r
                "distanceAttr": "nearDist",\r
                "indexAttr": "parent",\r
                "attribute": "",\r
                "outAttribute": "",\r
                "maxDistance": 0\r
              }\r
            },\r
            {\r
              "id": "stick",\r
              "type": "filterByExpression",\r
              "params": {\r
                "topology": "drop",\r
                "seed": 0,\r
                "predicate": {\r
                  "fn": "mul",\r
                  "args": [\r
                    {\r
                      "fn": "gt",\r
                      "args": [\r
                        {\r
                          "fn": "attribute",\r
                          "name": "nearDist"\r
                        },\r
                        0.0001\r
                      ]\r
                    },\r
                    {\r
                      "fn": "le",\r
                      "args": [\r
                        {\r
                          "fn": "attribute",\r
                          "name": "nearDist"\r
                        },\r
                        1.2\r
                      ]\r
                    }\r
                  ]\r
                }\r
              }\r
            },\r
            {\r
              "id": "fresh",\r
              "type": "setAttribute",\r
              "params": {\r
                "name": "fresh",\r
                "domain": "point",\r
                "type": "u32",\r
                "tupleSize": 1,\r
                "value": 1,\r
                "select": 0,\r
                "values": [],\r
                "weights": [],\r
                "stringValue": "",\r
                "seed": 0\r
              }\r
            },\r
            {\r
              "id": "stale",\r
              "type": "setAttribute",\r
              "params": {\r
                "name": "fresh",\r
                "domain": "point",\r
                "type": "u32",\r
                "tupleSize": 1,\r
                "value": 0,\r
                "select": 0,\r
                "values": [],\r
                "weights": [],\r
                "stringValue": "",\r
                "seed": 0\r
              }\r
            },\r
            {\r
              "id": "join",\r
              "type": "mergePoints",\r
              "params": {}\r
            },\r
            {\r
              "id": "moves",\r
              "type": "attributeReduce",\r
              "params": {\r
                "name": "fresh",\r
                "domain": "point",\r
                "mode": "sum",\r
                "outName": "moves"\r
              }\r
            }\r
          ],\r
          "connections": [\r
            {\r
              "from": [\r
                "pass",\r
                "out"\r
              ],\r
              "to": [\r
                "near",\r
                "source"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "near",\r
                "out"\r
              ],\r
              "to": [\r
                "stick",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "stick",\r
                "out"\r
              ],\r
              "to": [\r
                "fresh",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "pass",\r
                "out"\r
              ],\r
              "to": [\r
                "stale",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "stale",\r
                "out"\r
              ],\r
              "to": [\r
                "join",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "fresh",\r
                "out"\r
              ],\r
              "to": [\r
                "join",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "join",\r
                "out"\r
              ],\r
              "to": [\r
                "moves",\r
                "in"\r
              ]\r
            }\r
          ],\r
          "outputs": []\r
        },\r
        "inputs": [\r
          {\r
            "name": "carry",\r
            "node": "pass",\r
            "pin": "in"\r
          },\r
          {\r
            "name": "field",\r
            "node": "near",\r
            "pin": "in"\r
          }\r
        ],\r
        "outputs": [\r
          {\r
            "name": "carry",\r
            "node": "moves",\r
            "pin": "out"\r
          }\r
        ]\r
      }\r
    },\r
    {\r
      "id": "edges",\r
      "type": "connectByIndex",\r
      "params": {\r
        "index": {\r
          "fn": "attribute",\r
          "name": "parent"\r
        },\r
        "rootValue": -1,\r
        "outOfRange": "error",\r
        "degreeAttr": "degree",\r
        "lengthAttr": "edgeLength",\r
        "missCountAttr": ""\r
      }\r
    }\r
  ],\r
  "connections": [\r
    {\r
      "from": [\r
        "seedPt",\r
        "out"\r
      ],\r
      "to": [\r
        "seedParent",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "seedParent",\r
        "out"\r
      ],\r
      "to": [\r
        "grow",\r
        "carry"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "candidates",\r
        "out"\r
      ],\r
      "to": [\r
        "grow",\r
        "field"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "grow",\r
        "carry"\r
      ],\r
      "to": [\r
        "edges",\r
        "in"\r
      ]\r
    }\r
  ],\r
  "outputs": [\r
    {\r
      "id": "edges",\r
      "pin": "out",\r
      "name": "coral"\r
    }\r
  ]\r
}\r
`;export{e as default};