var e=`{
  "formatVersion": 1,
  "seed": 2202,
  "meta": {
    "title": "a dendrite grown by aggregation",
    "description": "AGGREGATION, which is the shape \`pointsToPath\` cannot describe and \`connectByIndex\` exists for. A seed point sits at the origin and a fixed cloud of candidates fills the box around it. Each round every candidate asks the structure so far for its nearest member; the ones within 1.2 units of it join, each REMEMBERING THE INDEX it was answered with, and the structure grows outward one shell at a time until no candidate is close enough to anything. What comes out is a parent pointer per point, and \`connectByIndex\` turns that column into the edges -- one 2-vertex polyline per point, from the point to the point it stuck to. Every link is its own edge and there are no linear runs to group by, so no assignment of \`pointsToPath\` group keys reaches this: its groups are vertex-disjoint chains, and a point three candidates chose would have to appear in three of them. THE INDEX SURVIVES THE ROUNDS, and that is the one thing this graph has to get right. An index is an ORDINAL, so a pointer is only worth keeping while nothing renumbers what it points into. \`mergePoints\` concatenates in connection order, existing points first, so the structure's own indices never move and a pointer written in round 3 still names the same point in round 20. Attach the new points the other way round and every pointer in the structure would silently shift by however many joined that round -- the edges would still build, and they would be wrong. The two nodes meet on a convention rather than on a wire: \`sampleNearestPoint\` writes -1 when it finds nothing and \`connectByIndex\` reads -1 as a root by default, so an unanswered point comes out as a point with no parent rather than as an error. THIS GRAPH NEVER EXERCISES THAT: \`maxDistance\` 0 means unlimited and the structure is never empty, so every candidate is answered and the only -1 in the cook is the seed's own, written before the loop. The convention still matters, because it is what lets a bounded reach be dropped in later without a second node to translate the sentinel. THE EPSILON IS NOT A TOLERANCE, it is what keeps a candidate from attaching twice: once a candidate has joined, the structure contains a point at exactly its position, so its nearest distance is 0 on every later round. Asking for a distance strictly ABOVE zero excludes the copy of itself, which is cheaper and more exact than carrying a used flag through the loop on a cloud that is broadcast fresh every round. WHY THE CANDIDATES ARE FIXED rather than drawn per round: \`repeatUntil\` does not rotate its seed, by design, so a scatter inside the body would draw the IDENTICAL cloud every round and the structure would see the same candidates forever. Randomness inside a growth loop has to come from the DATA changing, not from the seed moving -- here the structure grows, so different candidates come within reach each round from the same fixed cloud. It settles when a round attaches nothing, counted by summing a 0/1 \`fresh\` flag into the detail domain; mode \`count\` would report the element count and ignore the attribute, and over a structure that only grows it would never reach zero. THE STICK RADIUS IS MEASURED AGAINST THE CANDIDATE SPACING and is not a number to pick in world units, which took two failed cooks to learn. BELOW the mean spacing nothing propagates past the first ring: at 2.7 against a spacing of 2.86 this graph settled at THREE POINTS, because the points that joined had no unclaimed neighbour inside their own reach. Comfortably ABOVE it every candidate is already within reach of something on the first round and the entire cloud aggregates at once: at 2.4 against a spacing of 1.47, all 20,000 attached and the edge set was a solid hairball rather than a dendrite. What is shown here is the narrow band just above the spacing -- 1.2 against 0.8. It is PLANAR for the same reason: the identical rule in a 3D box draws as a ball of wire, and nothing about the mechanism needs the third dimension to be seen. One more thing this model does NOT have, and the description should not pretend otherwise: screening. Real diffusion-limited aggregation attaches one walker at a time, so tips shadow the interior and grow faster. Here every candidate is answered simultaneously, so what grows is a shell at a time and the branching comes from which neighbour was nearest, not from a race.",
    "tags": [
      "examples",
      "growth",
      "topology",
      "repeat"
    ]
  },
  "nodes": [
    {
      "id": "seedPt",
      "type": "pointLine",
      "params": {
        "mode": "endpoints",
        "count": 1,
        "start": [
          0,
          0,
          0
        ],
        "end": [
          0,
          0,
          0
        ]
      }
    },
    {
      "id": "seedParent",
      "type": "setAttribute",
      "params": {
        "name": "parent",
        "domain": "point",
        "type": "i32",
        "tupleSize": 1,
        "value": -1,
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "candidates",
      "type": "pointScatterInBounds",
      "params": {
        "count": 2500,
        "boundsMin": [
          -20,
          0,
          -20
        ],
        "boundsMax": [
          20,
          0,
          20
        ]
      }
    },
    {
      "id": "grow",
      "type": "repeatUntil",
      "params": {
        "maxRounds": 60,
        "settleAttr": "moves"
      },
      "subgraph": {
        "graph": {
          "formatVersion": 1,
          "seed": 0,
          "nodes": [
            {
              "id": "pass",
              "type": "transformPoints",
              "params": {
                "translate": [
                  0,
                  0,
                  0
                ],
                "rotateEuler": [
                  0,
                  0,
                  0
                ],
                "scale": [
                  1,
                  1,
                  1
                ]
              }
            },
            {
              "id": "near",
              "type": "sampleNearestPoint",
              "params": {
                "distanceAttr": "nearDist",
                "indexAttr": "parent",
                "attribute": "",
                "outAttribute": "",
                "maxDistance": 0
              }
            },
            {
              "id": "stick",
              "type": "filterByExpression",
              "params": {
                "topology": "drop",
                "seed": 0,
                "predicate": {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "gt",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "nearDist"
                        },
                        0.0001
                      ]
                    },
                    {
                      "fn": "le",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "nearDist"
                        },
                        1.2
                      ]
                    }
                  ]
                }
              }
            },
            {
              "id": "fresh",
              "type": "setAttribute",
              "params": {
                "name": "fresh",
                "domain": "point",
                "type": "u32",
                "tupleSize": 1,
                "value": 1,
                "select": 0,
                "values": [],
                "weights": [],
                "stringValue": "",
                "seed": 0
              }
            },
            {
              "id": "stale",
              "type": "setAttribute",
              "params": {
                "name": "fresh",
                "domain": "point",
                "type": "u32",
                "tupleSize": 1,
                "value": 0,
                "select": 0,
                "values": [],
                "weights": [],
                "stringValue": "",
                "seed": 0
              }
            },
            {
              "id": "join",
              "type": "mergePoints",
              "params": {}
            },
            {
              "id": "moves",
              "type": "attributeReduce",
              "params": {
                "name": "fresh",
                "domain": "point",
                "mode": "sum",
                "outName": "moves"
              }
            }
          ],
          "connections": [
            {
              "from": [
                "pass",
                "out"
              ],
              "to": [
                "near",
                "source"
              ]
            },
            {
              "from": [
                "near",
                "out"
              ],
              "to": [
                "stick",
                "in"
              ]
            },
            {
              "from": [
                "stick",
                "out"
              ],
              "to": [
                "fresh",
                "in"
              ]
            },
            {
              "from": [
                "pass",
                "out"
              ],
              "to": [
                "stale",
                "in"
              ]
            },
            {
              "from": [
                "stale",
                "out"
              ],
              "to": [
                "join",
                "in"
              ]
            },
            {
              "from": [
                "fresh",
                "out"
              ],
              "to": [
                "join",
                "in"
              ]
            },
            {
              "from": [
                "join",
                "out"
              ],
              "to": [
                "moves",
                "in"
              ]
            }
          ],
          "outputs": []
        },
        "inputs": [
          {
            "name": "carry",
            "node": "pass",
            "pin": "in"
          },
          {
            "name": "field",
            "node": "near",
            "pin": "in"
          }
        ],
        "outputs": [
          {
            "name": "carry",
            "node": "moves",
            "pin": "out"
          }
        ]
      }
    },
    {
      "id": "edges",
      "type": "connectByIndex",
      "params": {
        "index": {
          "fn": "attribute",
          "name": "parent"
        },
        "rootValue": -1,
        "outOfRange": "error",
        "degreeAttr": "degree",
        "lengthAttr": "edgeLength",
        "missCountAttr": ""
      }
    }
  ],
  "connections": [
    {
      "from": [
        "seedPt",
        "out"
      ],
      "to": [
        "seedParent",
        "in"
      ]
    },
    {
      "from": [
        "seedParent",
        "out"
      ],
      "to": [
        "grow",
        "carry"
      ]
    },
    {
      "from": [
        "candidates",
        "out"
      ],
      "to": [
        "grow",
        "field"
      ]
    },
    {
      "from": [
        "grow",
        "carry"
      ],
      "to": [
        "edges",
        "in"
      ]
    }
  ],
  "outputs": [
    {
      "id": "edges",
      "pin": "out",
      "name": "coral"
    }
  ]
}
`;export{e as default};