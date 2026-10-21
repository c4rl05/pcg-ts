var e=`{\r
  "formatVersion": 1,\r
  "seed": 2204,\r
  "meta": {\r
    "title": "Rooms from a split footprint, with a circulation net",\r
    "description": "THE SECOND CONSUMER of the subdivision \`examples-facade\` introduced, built to answer whether a \`splitBounds\` NODE is wanted. The answer it gives is no, and the reason is specific: the split machinery is identical between the two graphs -- the argmax over the three spans, the cut decided on the parent, the two-copy \`repeatPoints\` fan-out, the one \`setBounds\` that rewrites both corners from the box the cell arrived with -- and ONLY THE STOP RULE differs. A facade wants panels under a bounded SIZE; a plan wants rooms under a bounded floor AREA, because a long thin room has a small area while its longest wall says otherwise. A node would have to take the stop rule as a field to serve both, at which point it is \`repeatUntil\` with extra steps. What the two graphs share is a RECIPE WITH ONE HOLE IN IT, and extracting it into \`src/primitives/\` is the obvious move -- deliberately not made here. The hole is not what stops it: a primitive's param accepts a FIELD, spliced in where the body reads it and evaluated per element -- through a nested \`repeatUntil\` too, when the loop exposes the param and the primitive's declaration targets it -- so a recipe could take the stop rule whole, \`gt(longest span, 1.7)\` from the facade or \`gt(area, 26)\` from the plan. What two consumers do not settle is the recipe's shape around the hole: which of the cut range, the depth cap and the per-cell kind become knobs, and what it hands back. A third consumer is what would show that. A ROOM IS A POINT, exactly as a panel was: \`boundsMin\`/\`boundsMax\` is the room, and the plan is the set of leaves. The root box is thin in Y, so the vertical span is never the longest and every cut falls on one of the two floor axes, whichever is longer at that cell (which is not the same as alternating) -- the same trick the facade uses to stay flat, turned ninety degrees. THE KIND IS READ OFF THE AREA, which is the thing the facade deliberately did not have. A cell with no kind splits by one rule and makes a Mondrian; giving each leaf a STRING kind is what turns a subdivision into a plan you can talk about. It is spelled as \`setAttribute\` with an INDEX selector -- \`ge(area, 13) + ge(area, 19)\` counts how many thresholds an area clears and lands on 0, 1 or 2 in \`values\` -- because the grammar has no \`and\`/\`or\` and no switch, and summing predicates is how a staircase of thresholds is written here. THE BANDS MUST SIT INSIDE THE STOP RULE'S RANGE, which is not obvious and cost a cook: a cell stops splitting once its floor area is 26 or less (the literal in \`stillOpen\`), so a threshold ABOVE 26 can never fire and every room comes back the same kind. With a cut fraction in [0.34, 0.66), a child keeps at least 0.34 of a parent larger than 26, so the leaves land in roughly [0.34, 1] of that floor -- 8.9 to 26.0 square units over seeds 0 to 199 -- and the bands at 13 and 19 are chosen inside that. The depth cap of 9 that the facade's stop rule also carries never binds here: every seed from 0 to 199 has stopped on area by depth 7. That column is a real string attribute: \`byAttribute\` can dispatch on it, \`filterByAttribute\` can cut on it, and \`spawnInstances\` could send each kind to a different asset. DOORS ARE A PROXIMITY GRAPH, AND THAT IS NOT THE SAME AS ADJACENCY -- said plainly because the picture will not say it. \`connectPoints\` in \`relativeNeighborhood\` mode over the room centres keeps a pair only when no third centre is closer to both, which thins the complete graph into a circulation-looking net that still contains a spanning tree, so the plan is connected. But two rooms sharing a wall are not always each other's near neighbours, and two rooms that merely pass close diagonally can be joined. A true adjacency test asks whether two boxes share a FACE, which is a question about a pair of cells that no node in this library asks. Reading this graph as 'which rooms are next to each other' is reading it wrong; reading it as 'a circulation net over the rooms' is what it is. WHAT IT INHERITS WITHOUT RESTATING: the axis and the cut coordinate are decided on the PARENT, before \`repeatPoints\` fans it out, and every child reads them from the columns it carried -- because the two halves of a cell have different seeds (copy k gets hashCombine(seed, k)) and a cut drawn on each child would land at two different coordinates, leaving a strip that belongs to neither half or to both. The facade's description carries that measurement, invisible in the render; the same guard is why the rooms here tile their footprint exactly, 560 square units of leaves over a 560 square unit root.",\r
    "tags": [\r
      "examples",\r
      "structure",\r
      "repeat",\r
      "topology"\r
    ]\r
  },\r
  "nodes": [\r
    {\r
      "id": "rootPt",\r
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
      "id": "rootCell",\r
      "type": "setBounds",\r
      "params": {\r
        "boundsMin": [\r
          -14.0,\r
          0,\r
          -10.0\r
        ],\r
        "boundsMax": [\r
          14.0,\r
          0.25,\r
          10.0\r
        ]\r
      }\r
    },\r
    {\r
      "id": "rootDepth",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "depth",\r
        "domain": "point",\r
        "type": "i32",\r
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
      "id": "rootLive",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "live",\r
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
      "id": "split",\r
      "type": "repeatUntil",\r
      "params": {\r
        "maxRounds": 11,\r
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
              "id": "open",\r
              "type": "filterByAttribute",\r
              "params": {\r
                "attribute": "live",\r
                "comparison": "eq",\r
                "value": 1,\r
                "topology": "drop"\r
              }\r
            },\r
            {\r
              "id": "axis",\r
              "type": "setAttribute",\r
              "params": {\r
                "name": "axis",\r
                "domain": "point",\r
                "type": "f32",\r
                "tupleSize": 3,\r
                "value": {\r
                  "fn": "vec",\r
                  "args": [\r
                    {\r
                      "fn": "mul",\r
                      "args": [\r
                        {\r
                          "fn": "ge",\r
                          "args": [\r
                            {\r
                              "fn": "sub",\r
                              "args": [\r
                                {\r
                                  "fn": "component",\r
                                  "args": [\r
                                    {\r
                                      "fn": "attribute",\r
                                      "name": "boundsMax",\r
                                      "tupleSize": 3\r
                                    }\r
                                  ],\r
                                  "index": 0\r
                                },\r
                                {\r
                                  "fn": "component",\r
                                  "args": [\r
                                    {\r
                                      "fn": "attribute",\r
                                      "name": "boundsMin",\r
                                      "tupleSize": 3\r
                                    }\r
                                  ],\r
                                  "index": 0\r
                                }\r
                              ]\r
                            },\r
                            {\r
                              "fn": "sub",\r
                              "args": [\r
                                {\r
                                  "fn": "component",\r
                                  "args": [\r
                                    {\r
                                      "fn": "attribute",\r
                                      "name": "boundsMax",\r
                                      "tupleSize": 3\r
                                    }\r
                                  ],\r
                                  "index": 1\r
                                },\r
                                {\r
                                  "fn": "component",\r
                                  "args": [\r
                                    {\r
                                      "fn": "attribute",\r
                                      "name": "boundsMin",\r
                                      "tupleSize": 3\r
                                    }\r
                                  ],\r
                                  "index": 1\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "ge",\r
                          "args": [\r
                            {\r
                              "fn": "sub",\r
                              "args": [\r
                                {\r
                                  "fn": "component",\r
                                  "args": [\r
                                    {\r
                                      "fn": "attribute",\r
                                      "name": "boundsMax",\r
                                      "tupleSize": 3\r
                                    }\r
                                  ],\r
                                  "index": 0\r
                                },\r
                                {\r
                                  "fn": "component",\r
                                  "args": [\r
                                    {\r
                                      "fn": "attribute",\r
                                      "name": "boundsMin",\r
                                      "tupleSize": 3\r
                                    }\r
                                  ],\r
                                  "index": 0\r
                                }\r
                              ]\r
                            },\r
                            {\r
                              "fn": "sub",\r
                              "args": [\r
                                {\r
                                  "fn": "component",\r
                                  "args": [\r
                                    {\r
                                      "fn": "attribute",\r
                                      "name": "boundsMax",\r
                                      "tupleSize": 3\r
                                    }\r
                                  ],\r
                                  "index": 2\r
                                },\r
                                {\r
                                  "fn": "component",\r
                                  "args": [\r
                                    {\r
                                      "fn": "attribute",\r
                                      "name": "boundsMin",\r
                                      "tupleSize": 3\r
                                    }\r
                                  ],\r
                                  "index": 2\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    },\r
                    {\r
                      "fn": "mul",\r
                      "args": [\r
                        {\r
                          "fn": "mul",\r
                          "args": [\r
                            {\r
                              "fn": "ge",\r
                              "args": [\r
                                {\r
                                  "fn": "sub",\r
                                  "args": [\r
                                    {\r
                                      "fn": "component",\r
                                      "args": [\r
                                        {\r
                                          "fn": "attribute",\r
                                          "name": "boundsMax",\r
                                          "tupleSize": 3\r
                                        }\r
                                      ],\r
                                      "index": 1\r
                                    },\r
                                    {\r
                                      "fn": "component",\r
                                      "args": [\r
                                        {\r
                                          "fn": "attribute",\r
                                          "name": "boundsMin",\r
                                          "tupleSize": 3\r
                                        }\r
                                      ],\r
                                      "index": 1\r
                                    }\r
                                  ]\r
                                },\r
                                {\r
                                  "fn": "sub",\r
                                  "args": [\r
                                    {\r
                                      "fn": "component",\r
                                      "args": [\r
                                        {\r
                                          "fn": "attribute",\r
                                          "name": "boundsMax",\r
                                          "tupleSize": 3\r
                                        }\r
                                      ],\r
                                      "index": 0\r
                                    },\r
                                    {\r
                                      "fn": "component",\r
                                      "args": [\r
                                        {\r
                                          "fn": "attribute",\r
                                          "name": "boundsMin",\r
                                          "tupleSize": 3\r
                                        }\r
                                      ],\r
                                      "index": 0\r
                                    }\r
                                  ]\r
                                }\r
                              ]\r
                            },\r
                            {\r
                              "fn": "ge",\r
                              "args": [\r
                                {\r
                                  "fn": "sub",\r
                                  "args": [\r
                                    {\r
                                      "fn": "component",\r
                                      "args": [\r
                                        {\r
                                          "fn": "attribute",\r
                                          "name": "boundsMax",\r
                                          "tupleSize": 3\r
                                        }\r
                                      ],\r
                                      "index": 1\r
                                    },\r
                                    {\r
                                      "fn": "component",\r
                                      "args": [\r
                                        {\r
                                          "fn": "attribute",\r
                                          "name": "boundsMin",\r
                                          "tupleSize": 3\r
                                        }\r
                                      ],\r
                                      "index": 1\r
                                    }\r
                                  ]\r
                                },\r
                                {\r
                                  "fn": "sub",\r
                                  "args": [\r
                                    {\r
                                      "fn": "component",\r
                                      "args": [\r
                                        {\r
                                          "fn": "attribute",\r
                                          "name": "boundsMax",\r
                                          "tupleSize": 3\r
                                        }\r
                                      ],\r
                                      "index": 2\r
                                    },\r
                                    {\r
                                      "fn": "component",\r
                                      "args": [\r
                                        {\r
                                          "fn": "attribute",\r
                                          "name": "boundsMin",\r
                                          "tupleSize": 3\r
                                        }\r
                                      ],\r
                                      "index": 2\r
                                    }\r
                                  ]\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "sub",\r
                          "args": [\r
                            1,\r
                            {\r
                              "fn": "mul",\r
                              "args": [\r
                                {\r
                                  "fn": "ge",\r
                                  "args": [\r
                                    {\r
                                      "fn": "sub",\r
                                      "args": [\r
                                        {\r
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "boundsMax",\r
                                              "tupleSize": 3\r
                                            }\r
                                          ],\r
                                          "index": 0\r
                                        },\r
                                        {\r
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "boundsMin",\r
                                              "tupleSize": 3\r
                                            }\r
                                          ],\r
                                          "index": 0\r
                                        }\r
                                      ]\r
                                    },\r
                                    {\r
                                      "fn": "sub",\r
                                      "args": [\r
                                        {\r
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "boundsMax",\r
                                              "tupleSize": 3\r
                                            }\r
                                          ],\r
                                          "index": 1\r
                                        },\r
                                        {\r
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "boundsMin",\r
                                              "tupleSize": 3\r
                                            }\r
                                          ],\r
                                          "index": 1\r
                                        }\r
                                      ]\r
                                    }\r
                                  ]\r
                                },\r
                                {\r
                                  "fn": "ge",\r
                                  "args": [\r
                                    {\r
                                      "fn": "sub",\r
                                      "args": [\r
                                        {\r
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "boundsMax",\r
                                              "tupleSize": 3\r
                                            }\r
                                          ],\r
                                          "index": 0\r
                                        },\r
                                        {\r
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "boundsMin",\r
                                              "tupleSize": 3\r
                                            }\r
                                          ],\r
                                          "index": 0\r
                                        }\r
                                      ]\r
                                    },\r
                                    {\r
                                      "fn": "sub",\r
                                      "args": [\r
                                        {\r
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "boundsMax",\r
                                              "tupleSize": 3\r
                                            }\r
                                          ],\r
                                          "index": 2\r
                                        },\r
                                        {\r
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "boundsMin",\r
                                              "tupleSize": 3\r
                                            }\r
                                          ],\r
                                          "index": 2\r
                                        }\r
                                      ]\r
                                    }\r
                                  ]\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    },\r
                    {\r
                      "fn": "sub",\r
                      "args": [\r
                        1,\r
                        {\r
                          "fn": "add",\r
                          "args": [\r
                            {\r
                              "fn": "mul",\r
                              "args": [\r
                                {\r
                                  "fn": "ge",\r
                                  "args": [\r
                                    {\r
                                      "fn": "sub",\r
                                      "args": [\r
                                        {\r
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "boundsMax",\r
                                              "tupleSize": 3\r
                                            }\r
                                          ],\r
                                          "index": 0\r
                                        },\r
                                        {\r
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "boundsMin",\r
                                              "tupleSize": 3\r
                                            }\r
                                          ],\r
                                          "index": 0\r
                                        }\r
                                      ]\r
                                    },\r
                                    {\r
                                      "fn": "sub",\r
                                      "args": [\r
                                        {\r
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "boundsMax",\r
                                              "tupleSize": 3\r
                                            }\r
                                          ],\r
                                          "index": 1\r
                                        },\r
                                        {\r
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "boundsMin",\r
                                              "tupleSize": 3\r
                                            }\r
                                          ],\r
                                          "index": 1\r
                                        }\r
                                      ]\r
                                    }\r
                                  ]\r
                                },\r
                                {\r
                                  "fn": "ge",\r
                                  "args": [\r
                                    {\r
                                      "fn": "sub",\r
                                      "args": [\r
                                        {\r
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "boundsMax",\r
                                              "tupleSize": 3\r
                                            }\r
                                          ],\r
                                          "index": 0\r
                                        },\r
                                        {\r
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "boundsMin",\r
                                              "tupleSize": 3\r
                                            }\r
                                          ],\r
                                          "index": 0\r
                                        }\r
                                      ]\r
                                    },\r
                                    {\r
                                      "fn": "sub",\r
                                      "args": [\r
                                        {\r
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "boundsMax",\r
                                              "tupleSize": 3\r
                                            }\r
                                          ],\r
                                          "index": 2\r
                                        },\r
                                        {\r
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "boundsMin",\r
                                              "tupleSize": 3\r
                                            }\r
                                          ],\r
                                          "index": 2\r
                                        }\r
                                      ]\r
                                    }\r
                                  ]\r
                                }\r
                              ]\r
                            },\r
                            {\r
                              "fn": "mul",\r
                              "args": [\r
                                {\r
                                  "fn": "mul",\r
                                  "args": [\r
                                    {\r
                                      "fn": "ge",\r
                                      "args": [\r
                                        {\r
                                          "fn": "sub",\r
                                          "args": [\r
                                            {\r
                                              "fn": "component",\r
                                              "args": [\r
                                                {\r
                                                  "fn": "attribute",\r
                                                  "name": "boundsMax",\r
                                                  "tupleSize": 3\r
                                                }\r
                                              ],\r
                                              "index": 1\r
                                            },\r
                                            {\r
                                              "fn": "component",\r
                                              "args": [\r
                                                {\r
                                                  "fn": "attribute",\r
                                                  "name": "boundsMin",\r
                                                  "tupleSize": 3\r
                                                }\r
                                              ],\r
                                              "index": 1\r
                                            }\r
                                          ]\r
                                        },\r
                                        {\r
                                          "fn": "sub",\r
                                          "args": [\r
                                            {\r
                                              "fn": "component",\r
                                              "args": [\r
                                                {\r
                                                  "fn": "attribute",\r
                                                  "name": "boundsMax",\r
                                                  "tupleSize": 3\r
                                                }\r
                                              ],\r
                                              "index": 0\r
                                            },\r
                                            {\r
                                              "fn": "component",\r
                                              "args": [\r
                                                {\r
                                                  "fn": "attribute",\r
                                                  "name": "boundsMin",\r
                                                  "tupleSize": 3\r
                                                }\r
                                              ],\r
                                              "index": 0\r
                                            }\r
                                          ]\r
                                        }\r
                                      ]\r
                                    },\r
                                    {\r
                                      "fn": "ge",\r
                                      "args": [\r
                                        {\r
                                          "fn": "sub",\r
                                          "args": [\r
                                            {\r
                                              "fn": "component",\r
                                              "args": [\r
                                                {\r
                                                  "fn": "attribute",\r
                                                  "name": "boundsMax",\r
                                                  "tupleSize": 3\r
                                                }\r
                                              ],\r
                                              "index": 1\r
                                            },\r
                                            {\r
                                              "fn": "component",\r
                                              "args": [\r
                                                {\r
                                                  "fn": "attribute",\r
                                                  "name": "boundsMin",\r
                                                  "tupleSize": 3\r
                                                }\r
                                              ],\r
                                              "index": 1\r
                                            }\r
                                          ]\r
                                        },\r
                                        {\r
                                          "fn": "sub",\r
                                          "args": [\r
                                            {\r
                                              "fn": "component",\r
                                              "args": [\r
                                                {\r
                                                  "fn": "attribute",\r
                                                  "name": "boundsMax",\r
                                                  "tupleSize": 3\r
                                                }\r
                                              ],\r
                                              "index": 2\r
                                            },\r
                                            {\r
                                              "fn": "component",\r
                                              "args": [\r
                                                {\r
                                                  "fn": "attribute",\r
                                                  "name": "boundsMin",\r
                                                  "tupleSize": 3\r
                                                }\r
                                              ],\r
                                              "index": 2\r
                                            }\r
                                          ]\r
                                        }\r
                                      ]\r
                                    }\r
                                  ]\r
                                },\r
                                {\r
                                  "fn": "sub",\r
                                  "args": [\r
                                    1,\r
                                    {\r
                                      "fn": "mul",\r
                                      "args": [\r
                                        {\r
                                          "fn": "ge",\r
                                          "args": [\r
                                            {\r
                                              "fn": "sub",\r
                                              "args": [\r
                                                {\r
                                                  "fn": "component",\r
                                                  "args": [\r
                                                    {\r
                                                      "fn": "attribute",\r
                                                      "name": "boundsMax",\r
                                                      "tupleSize": 3\r
                                                    }\r
                                                  ],\r
                                                  "index": 0\r
                                                },\r
                                                {\r
                                                  "fn": "component",\r
                                                  "args": [\r
                                                    {\r
                                                      "fn": "attribute",\r
                                                      "name": "boundsMin",\r
                                                      "tupleSize": 3\r
                                                    }\r
                                                  ],\r
                                                  "index": 0\r
                                                }\r
                                              ]\r
                                            },\r
                                            {\r
                                              "fn": "sub",\r
                                              "args": [\r
                                                {\r
                                                  "fn": "component",\r
                                                  "args": [\r
                                                    {\r
                                                      "fn": "attribute",\r
                                                      "name": "boundsMax",\r
                                                      "tupleSize": 3\r
                                                    }\r
                                                  ],\r
                                                  "index": 1\r
                                                },\r
                                                {\r
                                                  "fn": "component",\r
                                                  "args": [\r
                                                    {\r
                                                      "fn": "attribute",\r
                                                      "name": "boundsMin",\r
                                                      "tupleSize": 3\r
                                                    }\r
                                                  ],\r
                                                  "index": 1\r
                                                }\r
                                              ]\r
                                            }\r
                                          ]\r
                                        },\r
                                        {\r
                                          "fn": "ge",\r
                                          "args": [\r
                                            {\r
                                              "fn": "sub",\r
                                              "args": [\r
                                                {\r
                                                  "fn": "component",\r
                                                  "args": [\r
                                                    {\r
                                                      "fn": "attribute",\r
                                                      "name": "boundsMax",\r
                                                      "tupleSize": 3\r
                                                    }\r
                                                  ],\r
                                                  "index": 0\r
                                                },\r
                                                {\r
                                                  "fn": "component",\r
                                                  "args": [\r
                                                    {\r
                                                      "fn": "attribute",\r
                                                      "name": "boundsMin",\r
                                                      "tupleSize": 3\r
                                                    }\r
                                                  ],\r
                                                  "index": 0\r
                                                }\r
                                              ]\r
                                            },\r
                                            {\r
                                              "fn": "sub",\r
                                              "args": [\r
                                                {\r
                                                  "fn": "component",\r
                                                  "args": [\r
                                                    {\r
                                                      "fn": "attribute",\r
                                                      "name": "boundsMax",\r
                                                      "tupleSize": 3\r
                                                    }\r
                                                  ],\r
                                                  "index": 2\r
                                                },\r
                                                {\r
                                                  "fn": "component",\r
                                                  "args": [\r
                                                    {\r
                                                      "fn": "attribute",\r
                                                      "name": "boundsMin",\r
                                                      "tupleSize": 3\r
                                                    }\r
                                                  ],\r
                                                  "index": 2\r
                                                }\r
                                              ]\r
                                            }\r
                                          ]\r
                                        }\r
                                      ]\r
                                    }\r
                                  ]\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    }\r
                  ]\r
                },\r
                "select": 0,\r
                "values": [],\r
                "weights": [],\r
                "stringValue": "",\r
                "seed": 0\r
              }\r
            },\r
            {\r
              "id": "where",\r
              "type": "setAttribute",\r
              "params": {\r
                "name": "cutAt",\r
                "domain": "point",\r
                "type": "f32",\r
                "tupleSize": 1,\r
                "value": {\r
                  "fn": "add",\r
                  "args": [\r
                    {\r
                      "fn": "add",\r
                      "args": [\r
                        {\r
                          "fn": "mul",\r
                          "args": [\r
                            {\r
                              "fn": "component",\r
                              "args": [\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "axis",\r
                                  "tupleSize": 3\r
                                }\r
                              ],\r
                              "index": 0\r
                            },\r
                            {\r
                              "fn": "component",\r
                              "args": [\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "boundsMin",\r
                                  "tupleSize": 3\r
                                }\r
                              ],\r
                              "index": 0\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "add",\r
                          "args": [\r
                            {\r
                              "fn": "mul",\r
                              "args": [\r
                                {\r
                                  "fn": "component",\r
                                  "args": [\r
                                    {\r
                                      "fn": "attribute",\r
                                      "name": "axis",\r
                                      "tupleSize": 3\r
                                    }\r
                                  ],\r
                                  "index": 1\r
                                },\r
                                {\r
                                  "fn": "component",\r
                                  "args": [\r
                                    {\r
                                      "fn": "attribute",\r
                                      "name": "boundsMin",\r
                                      "tupleSize": 3\r
                                    }\r
                                  ],\r
                                  "index": 1\r
                                }\r
                              ]\r
                            },\r
                            {\r
                              "fn": "mul",\r
                              "args": [\r
                                {\r
                                  "fn": "component",\r
                                  "args": [\r
                                    {\r
                                      "fn": "attribute",\r
                                      "name": "axis",\r
                                      "tupleSize": 3\r
                                    }\r
                                  ],\r
                                  "index": 2\r
                                },\r
                                {\r
                                  "fn": "component",\r
                                  "args": [\r
                                    {\r
                                      "fn": "attribute",\r
                                      "name": "boundsMin",\r
                                      "tupleSize": 3\r
                                    }\r
                                  ],\r
                                  "index": 2\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    },\r
                    {\r
                      "fn": "mul",\r
                      "args": [\r
                        {\r
                          "fn": "add",\r
                          "args": [\r
                            0.34,\r
                            {\r
                              "fn": "mul",\r
                              "args": [\r
                                0.32,\r
                                {\r
                                  "fn": "randomField",\r
                                  "key": "cut"\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "add",\r
                          "args": [\r
                            {\r
                              "fn": "mul",\r
                              "args": [\r
                                {\r
                                  "fn": "component",\r
                                  "args": [\r
                                    {\r
                                      "fn": "attribute",\r
                                      "name": "axis",\r
                                      "tupleSize": 3\r
                                    }\r
                                  ],\r
                                  "index": 0\r
                                },\r
                                {\r
                                  "fn": "sub",\r
                                  "args": [\r
                                    {\r
                                      "fn": "component",\r
                                      "args": [\r
                                        {\r
                                          "fn": "attribute",\r
                                          "name": "boundsMax",\r
                                          "tupleSize": 3\r
                                        }\r
                                      ],\r
                                      "index": 0\r
                                    },\r
                                    {\r
                                      "fn": "component",\r
                                      "args": [\r
                                        {\r
                                          "fn": "attribute",\r
                                          "name": "boundsMin",\r
                                          "tupleSize": 3\r
                                        }\r
                                      ],\r
                                      "index": 0\r
                                    }\r
                                  ]\r
                                }\r
                              ]\r
                            },\r
                            {\r
                              "fn": "add",\r
                              "args": [\r
                                {\r
                                  "fn": "mul",\r
                                  "args": [\r
                                    {\r
                                      "fn": "component",\r
                                      "args": [\r
                                        {\r
                                          "fn": "attribute",\r
                                          "name": "axis",\r
                                          "tupleSize": 3\r
                                        }\r
                                      ],\r
                                      "index": 1\r
                                    },\r
                                    {\r
                                      "fn": "sub",\r
                                      "args": [\r
                                        {\r
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "boundsMax",\r
                                              "tupleSize": 3\r
                                            }\r
                                          ],\r
                                          "index": 1\r
                                        },\r
                                        {\r
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "boundsMin",\r
                                              "tupleSize": 3\r
                                            }\r
                                          ],\r
                                          "index": 1\r
                                        }\r
                                      ]\r
                                    }\r
                                  ]\r
                                },\r
                                {\r
                                  "fn": "mul",\r
                                  "args": [\r
                                    {\r
                                      "fn": "component",\r
                                      "args": [\r
                                        {\r
                                          "fn": "attribute",\r
                                          "name": "axis",\r
                                          "tupleSize": 3\r
                                        }\r
                                      ],\r
                                      "index": 2\r
                                    },\r
                                    {\r
                                      "fn": "sub",\r
                                      "args": [\r
                                        {\r
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "boundsMax",\r
                                              "tupleSize": 3\r
                                            }\r
                                          ],\r
                                          "index": 2\r
                                        },\r
                                        {\r
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "boundsMin",\r
                                              "tupleSize": 3\r
                                            }\r
                                          ],\r
                                          "index": 2\r
                                        }\r
                                      ]\r
                                    }\r
                                  ]\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    }\r
                  ]\r
                },\r
                "select": 0,\r
                "values": [],\r
                "weights": [],\r
                "stringValue": "",\r
                "seed": 0\r
              }\r
            },\r
            {\r
              "id": "halves",\r
              "type": "repeatPoints",\r
              "params": {\r
                "count": 2,\r
                "indexAttr": "slot",\r
                "countAttr": ""\r
              }\r
            },\r
            {\r
              "id": "deeper",\r
              "type": "setAttribute",\r
              "params": {\r
                "name": "depth",\r
                "domain": "point",\r
                "type": "i32",\r
                "tupleSize": 1,\r
                "value": {\r
                  "fn": "add",\r
                  "args": [\r
                    {\r
                      "fn": "attribute",\r
                      "name": "depth"\r
                    },\r
                    1\r
                  ]\r
                },\r
                "select": 0,\r
                "values": [],\r
                "weights": [],\r
                "stringValue": "",\r
                "seed": 0\r
              }\r
            },\r
            {\r
              "id": "cut",\r
              "type": "setBounds",\r
              "params": {\r
                "boundsMin": {\r
                  "fn": "vec",\r
                  "args": [\r
                    {\r
                      "fn": "select",\r
                      "args": [\r
                        {\r
                          "fn": "mul",\r
                          "args": [\r
                            {\r
                              "fn": "component",\r
                              "args": [\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "axis",\r
                                  "tupleSize": 3\r
                                }\r
                              ],\r
                              "index": 0\r
                            },\r
                            {\r
                              "fn": "attribute",\r
                              "name": "slot"\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "attribute",\r
                          "name": "cutAt"\r
                        },\r
                        {\r
                          "fn": "component",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "boundsMin",\r
                              "tupleSize": 3\r
                            }\r
                          ],\r
                          "index": 0\r
                        }\r
                      ]\r
                    },\r
                    {\r
                      "fn": "select",\r
                      "args": [\r
                        {\r
                          "fn": "mul",\r
                          "args": [\r
                            {\r
                              "fn": "component",\r
                              "args": [\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "axis",\r
                                  "tupleSize": 3\r
                                }\r
                              ],\r
                              "index": 1\r
                            },\r
                            {\r
                              "fn": "attribute",\r
                              "name": "slot"\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "attribute",\r
                          "name": "cutAt"\r
                        },\r
                        {\r
                          "fn": "component",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "boundsMin",\r
                              "tupleSize": 3\r
                            }\r
                          ],\r
                          "index": 1\r
                        }\r
                      ]\r
                    },\r
                    {\r
                      "fn": "select",\r
                      "args": [\r
                        {\r
                          "fn": "mul",\r
                          "args": [\r
                            {\r
                              "fn": "component",\r
                              "args": [\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "axis",\r
                                  "tupleSize": 3\r
                                }\r
                              ],\r
                              "index": 2\r
                            },\r
                            {\r
                              "fn": "attribute",\r
                              "name": "slot"\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "attribute",\r
                          "name": "cutAt"\r
                        },\r
                        {\r
                          "fn": "component",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "boundsMin",\r
                              "tupleSize": 3\r
                            }\r
                          ],\r
                          "index": 2\r
                        }\r
                      ]\r
                    }\r
                  ]\r
                },\r
                "boundsMax": {\r
                  "fn": "vec",\r
                  "args": [\r
                    {\r
                      "fn": "select",\r
                      "args": [\r
                        {\r
                          "fn": "mul",\r
                          "args": [\r
                            {\r
                              "fn": "component",\r
                              "args": [\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "axis",\r
                                  "tupleSize": 3\r
                                }\r
                              ],\r
                              "index": 0\r
                            },\r
                            {\r
                              "fn": "sub",\r
                              "args": [\r
                                1,\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "slot"\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "attribute",\r
                          "name": "cutAt"\r
                        },\r
                        {\r
                          "fn": "component",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "boundsMax",\r
                              "tupleSize": 3\r
                            }\r
                          ],\r
                          "index": 0\r
                        }\r
                      ]\r
                    },\r
                    {\r
                      "fn": "select",\r
                      "args": [\r
                        {\r
                          "fn": "mul",\r
                          "args": [\r
                            {\r
                              "fn": "component",\r
                              "args": [\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "axis",\r
                                  "tupleSize": 3\r
                                }\r
                              ],\r
                              "index": 1\r
                            },\r
                            {\r
                              "fn": "sub",\r
                              "args": [\r
                                1,\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "slot"\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "attribute",\r
                          "name": "cutAt"\r
                        },\r
                        {\r
                          "fn": "component",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "boundsMax",\r
                              "tupleSize": 3\r
                            }\r
                          ],\r
                          "index": 1\r
                        }\r
                      ]\r
                    },\r
                    {\r
                      "fn": "select",\r
                      "args": [\r
                        {\r
                          "fn": "mul",\r
                          "args": [\r
                            {\r
                              "fn": "component",\r
                              "args": [\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "axis",\r
                                  "tupleSize": 3\r
                                }\r
                              ],\r
                              "index": 2\r
                            },\r
                            {\r
                              "fn": "sub",\r
                              "args": [\r
                                1,\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "slot"\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "attribute",\r
                          "name": "cutAt"\r
                        },\r
                        {\r
                          "fn": "component",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "boundsMax",\r
                              "tupleSize": 3\r
                            }\r
                          ],\r
                          "index": 2\r
                        }\r
                      ]\r
                    }\r
                  ]\r
                }\r
              }\r
            },\r
            {\r
              "id": "stillOpen",\r
              "type": "setAttribute",\r
              "params": {\r
                "name": "live",\r
                "domain": "point",\r
                "type": "u32",\r
                "tupleSize": 1,\r
                "value": {\r
                  "fn": "mul",\r
                  "args": [\r
                    {\r
                      "fn": "lt",\r
                      "args": [\r
                        {\r
                          "fn": "attribute",\r
                          "name": "depth"\r
                        },\r
                        9\r
                      ]\r
                    },\r
                    {\r
                      "fn": "gt",\r
                      "args": [\r
                        {\r
                          "fn": "mul",\r
                          "args": [\r
                            {\r
                              "fn": "sub",\r
                              "args": [\r
                                {\r
                                  "fn": "component",\r
                                  "args": [\r
                                    {\r
                                      "fn": "attribute",\r
                                      "name": "boundsMax",\r
                                      "tupleSize": 3\r
                                    }\r
                                  ],\r
                                  "index": 0\r
                                },\r
                                {\r
                                  "fn": "component",\r
                                  "args": [\r
                                    {\r
                                      "fn": "attribute",\r
                                      "name": "boundsMin",\r
                                      "tupleSize": 3\r
                                    }\r
                                  ],\r
                                  "index": 0\r
                                }\r
                              ]\r
                            },\r
                            {\r
                              "fn": "sub",\r
                              "args": [\r
                                {\r
                                  "fn": "component",\r
                                  "args": [\r
                                    {\r
                                      "fn": "attribute",\r
                                      "name": "boundsMax",\r
                                      "tupleSize": 3\r
                                    }\r
                                  ],\r
                                  "index": 2\r
                                },\r
                                {\r
                                  "fn": "component",\r
                                  "args": [\r
                                    {\r
                                      "fn": "attribute",\r
                                      "name": "boundsMin",\r
                                      "tupleSize": 3\r
                                    }\r
                                  ],\r
                                  "index": 2\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        },\r
                        26.0\r
                      ]\r
                    }\r
                  ]\r
                },\r
                "select": 0,\r
                "values": [],\r
                "weights": [],\r
                "stringValue": "",\r
                "seed": 0\r
              }\r
            },\r
            {\r
              "id": "leaves",\r
              "type": "filterByAttribute",\r
              "params": {\r
                "attribute": "live",\r
                "comparison": "eq",\r
                "value": 0,\r
                "topology": "drop"\r
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
                "name": "live",\r
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
                "open",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "open",\r
                "out"\r
              ],\r
              "to": [\r
                "axis",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "axis",\r
                "out"\r
              ],\r
              "to": [\r
                "where",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "where",\r
                "out"\r
              ],\r
              "to": [\r
                "halves",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "halves",\r
                "out"\r
              ],\r
              "to": [\r
                "deeper",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "deeper",\r
                "out"\r
              ],\r
              "to": [\r
                "cut",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "cut",\r
                "out"\r
              ],\r
              "to": [\r
                "stillOpen",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "pass",\r
                "out"\r
              ],\r
              "to": [\r
                "leaves",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "leaves",\r
                "out"\r
              ],\r
              "to": [\r
                "join",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "stillOpen",\r
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
      "id": "centre",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "P",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 3,\r
        "value": {\r
          "fn": "mul",\r
          "args": [\r
            0.5,\r
            {\r
              "fn": "add",\r
              "args": [\r
                {\r
                  "fn": "attribute",\r
                  "name": "boundsMin",\r
                  "tupleSize": 3\r
                },\r
                {\r
                  "fn": "attribute",\r
                  "name": "boundsMax",\r
                  "tupleSize": 3\r
                }\r
              ]\r
            }\r
          ]\r
        },\r
        "select": 0,\r
        "values": [],\r
        "weights": [],\r
        "stringValue": "",\r
        "seed": 0\r
      }\r
    },\r
    {\r
      "id": "kind",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "kind",\r
        "domain": "point",\r
        "type": "string",\r
        "tupleSize": 1,\r
        "value": {\r
          "fn": "add",\r
          "args": [\r
            {\r
              "fn": "ge",\r
              "args": [\r
                {\r
                  "fn": "mul",\r
                  "args": [\r
                    {\r
                      "fn": "sub",\r
                      "args": [\r
                        {\r
                          "fn": "component",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "boundsMax",\r
                              "tupleSize": 3\r
                            }\r
                          ],\r
                          "index": 0\r
                        },\r
                        {\r
                          "fn": "component",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "boundsMin",\r
                              "tupleSize": 3\r
                            }\r
                          ],\r
                          "index": 0\r
                        }\r
                      ]\r
                    },\r
                    {\r
                      "fn": "sub",\r
                      "args": [\r
                        {\r
                          "fn": "component",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "boundsMax",\r
                              "tupleSize": 3\r
                            }\r
                          ],\r
                          "index": 2\r
                        },\r
                        {\r
                          "fn": "component",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "boundsMin",\r
                              "tupleSize": 3\r
                            }\r
                          ],\r
                          "index": 2\r
                        }\r
                      ]\r
                    }\r
                  ]\r
                },\r
                13\r
              ]\r
            },\r
            {\r
              "fn": "ge",\r
              "args": [\r
                {\r
                  "fn": "mul",\r
                  "args": [\r
                    {\r
                      "fn": "sub",\r
                      "args": [\r
                        {\r
                          "fn": "component",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "boundsMax",\r
                              "tupleSize": 3\r
                            }\r
                          ],\r
                          "index": 0\r
                        },\r
                        {\r
                          "fn": "component",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "boundsMin",\r
                              "tupleSize": 3\r
                            }\r
                          ],\r
                          "index": 0\r
                        }\r
                      ]\r
                    },\r
                    {\r
                      "fn": "sub",\r
                      "args": [\r
                        {\r
                          "fn": "component",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "boundsMax",\r
                              "tupleSize": 3\r
                            }\r
                          ],\r
                          "index": 2\r
                        },\r
                        {\r
                          "fn": "component",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "boundsMin",\r
                              "tupleSize": 3\r
                            }\r
                          ],\r
                          "index": 2\r
                        }\r
                      ]\r
                    }\r
                  ]\r
                },\r
                19\r
              ]\r
            }\r
          ]\r
        },\r
        "select": 0,\r
        "values": [\r
          "closet",\r
          "room",\r
          "hall"\r
        ],\r
        "weights": [],\r
        "stringValue": "",\r
        "seed": 0\r
      }\r
    },\r
    {\r
      "id": "slab",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "scale",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 3,\r
        "value": {\r
          "fn": "mul",\r
          "args": [\r
            0.9,\r
            {\r
              "fn": "sub",\r
              "args": [\r
                {\r
                  "fn": "attribute",\r
                  "name": "boundsMax",\r
                  "tupleSize": 3\r
                },\r
                {\r
                  "fn": "attribute",\r
                  "name": "boundsMin",\r
                  "tupleSize": 3\r
                }\r
              ]\r
            }\r
          ]\r
        },\r
        "select": 0,\r
        "values": [],\r
        "weights": [],\r
        "stringValue": "",\r
        "seed": 0\r
      }\r
    },\r
    {\r
      "id": "unitBox",\r
      "type": "meshPrimitive",\r
      "params": {\r
        "shape": "box",\r
        "size": [\r
          1,\r
          1,\r
          1\r
        ],\r
        "center": [\r
          0,\r
          0,\r
          0\r
        ],\r
        "orientation": "xz",\r
        "subdivisions": [\r
          1,\r
          1,\r
          1\r
        ],\r
        "flip": false\r
      }\r
    },\r
    {\r
      "id": "rooms",\r
      "type": "copyToPoints",\r
      "params": {\r
        "targetNames": [],\r
        "targetIndexAttr": "",\r
        "sourceGroupAttr": "",\r
        "targetGroupAttr": "",\r
        "topology": "keep"\r
      }\r
    },\r
    {\r
      "id": "lift",\r
      "type": "transformPoints",\r
      "params": {\r
        "translate": [\r
          0,\r
          0.75,\r
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
      "id": "doors",\r
      "type": "connectPoints",\r
      "params": {\r
        "mode": "relativeNeighborhood",\r
        "radius": 12.0,\r
        "degreeAttr": "degree",\r
        "lengthAttr": "doorRun"\r
      }\r
    },\r
    {\r
      "id": "plan",\r
      "type": "mergePrimitives",\r
      "params": {}\r
    }\r
  ],\r
  "connections": [\r
    {\r
      "from": [\r
        "rootPt",\r
        "out"\r
      ],\r
      "to": [\r
        "rootCell",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "rootCell",\r
        "out"\r
      ],\r
      "to": [\r
        "rootDepth",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "rootDepth",\r
        "out"\r
      ],\r
      "to": [\r
        "rootLive",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "rootLive",\r
        "out"\r
      ],\r
      "to": [\r
        "split",\r
        "carry"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "split",\r
        "carry"\r
      ],\r
      "to": [\r
        "centre",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "centre",\r
        "out"\r
      ],\r
      "to": [\r
        "kind",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "kind",\r
        "out"\r
      ],\r
      "to": [\r
        "slab",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "unitBox",\r
        "out"\r
      ],\r
      "to": [\r
        "rooms",\r
        "source"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "slab",\r
        "out"\r
      ],\r
      "to": [\r
        "rooms",\r
        "target"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "kind",\r
        "out"\r
      ],\r
      "to": [\r
        "lift",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "lift",\r
        "out"\r
      ],\r
      "to": [\r
        "doors",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "rooms",\r
        "out"\r
      ],\r
      "to": [\r
        "plan",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "doors",\r
        "out"\r
      ],\r
      "to": [\r
        "plan",\r
        "in"\r
      ]\r
    }\r
  ],\r
  "outputs": [\r
    {\r
      "id": "plan",\r
      "pin": "out",\r
      "name": "plan"\r
    }\r
  ]\r
}\r
`;export{e as default};