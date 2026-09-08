var e=`{\r
  "formatVersion": 1,\r
  "seed": 2203,\r
  "meta": {\r
    "title": "split a box until the pieces are small enough",\r
    "description": "RECURSIVE SUBDIVISION WITHOUT RECURSION, which is the third thing this corpus does with \`repeatUntil\` and the one that looks least like a loop. A split grammar is normally written as a function that calls itself on each half; a subgraph here may not reference itself, so the same structure is spelled as a loop whose carry is THE WHOLE SET OF CELLS and whose body replaces every open cell with its two halves. What comes back is the leaves -- the cells nothing wanted to split again -- and the tree that produced them is gone, which is exactly what a facade needs. A CELL IS A POINT, and the box it stands for is the \`boundsMin\`/\`boundsMax\` pair every point in this library already carries. Nothing new had to be represented: the standard bounds columns ARE the cell, \`setBounds\` is field-capable per point so the two halves can be computed in one node, and the split rule is ordinary arithmetic over them. THE AXIS IS ARGMAX OF THE THREE SPANS, and the grammar has no \`argmax\` and no \`and\` -- \`mul\` is AND on 0/1 predicates, so \`isX\` is \`ge(sx,sy) * ge(sx,sz)\` and the later flags subtract the ones already claimed, which makes the three mutually exclusive without a branch. Splitting the LONGEST span is what keeps the cells from degenerating into slivers: split a fixed axis and every cell ends up as tall as the facade and a finger wide. It is also why this reads as a flat panel with no third dimension named anywhere -- the root box is 0.4 deep, so Z is never the longest span and never gets chosen. THE PARENT'S CORNERS TRAVEL UNDER DIFFERENT NAMES, and that is not a stylistic choice. \`copyToPoints\` refuses to carry a target attribute the source already holds, and \`boundsMin\`/\`boundsMax\` are STANDARD columns, so the rule cloud carries its own pair and the parent's would collide. They are copied into \`cellMin\`/\`cellMax\` first and carried as those; the split then reads the copies and writes the real pair, so there is no round in which a half is computed from bounds another half already overwrote. WHERE TO CUT IS THE PARENT'S DECISION, and getting that wrong is the defect this graph was built with. The fraction started as a \`randomField\` read inside the split, on the child -- and the two halves of one cell have DIFFERENT seeds, so they drew different fractions and cut at two different coordinates. The lower half ended at one, the upper began at the other, and the sliver between them belonged to neither. Nothing failed: every cell was still a valid box, the picture still looked like a subdivided panel, and 23.1 of the 360 square units simply were not there. The rule is that a decision SHARED by the children is made on the parent and carried down, and only a decision that differs per child may be drawn after the fan-out. Cutting is shared, so \`cutFrac\` is written on the open cell before \`copyToPoints\` and travels in \`targetNames\`; the summed area of the leaves is then 360.0000 against a root of 360, which is the assertion worth making about a subdivision and the one a picture cannot make for you. THE RULE CLOUD IS A FAN-OUT AND NOTHING ELSE: two coincident points at the origin, so a child lands exactly on its parent and \`slot\` -- recoverable as \`mod(index, 2)\` only because copies arrive in contiguous per-target blocks -- decides which half it becomes. IT STOPS ON TWO CONDITIONS, both needed. A depth cap alone leaves the cells of a wide facade still wide; a size floor alone can be chased forever by a sliver the argmax keeps halving. Settling sums the 0/1 \`live\` flag into the detail domain -- mode \`count\` reports the element count and ignores the attribute named, so over a set of cells that only grows it never reaches zero. WHAT IT IS NOT: a grammar. Every cell splits by the same rule, so this makes a Mondrian rather than a facade with a stated vocabulary of bays and openings. Giving a cell a KIND, and choosing the rule by that kind, is the next thing and wants \`byAttribute\` over a string; nothing here is in its way.",\r
    "tags": [\r
      "examples",\r
      "structure",\r
      "repeat",\r
      "bounds"\r
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
          -12.0,\r
          0,\r
          -0.2\r
        ],\r
        "boundsMax": [\r
          12.0,\r
          15.0,\r
          0.2\r
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
      "id": "rules",\r
      "type": "pointLine",\r
      "params": {\r
        "mode": "endpoints",\r
        "count": 2,\r
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
      "id": "ruleP",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "P",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 3,\r
        "value": {\r
          "fn": "vec",\r
          "args": [\r
            0,\r
            0,\r
            0\r
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
      "id": "ruleSeed",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "seed",\r
        "domain": "point",\r
        "type": "u32",\r
        "tupleSize": 1,\r
        "value": {\r
          "fn": "add",\r
          "args": [\r
            17,\r
            {\r
              "fn": "mul",\r
              "args": [\r
                {\r
                  "fn": "index"\r
                },\r
                6151\r
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
              "id": "keepLo",\r
              "type": "setAttribute",\r
              "params": {\r
                "name": "cellMin",\r
                "domain": "point",\r
                "type": "f32",\r
                "tupleSize": 3,\r
                "value": {\r
                  "fn": "attribute",\r
                  "name": "boundsMin",\r
                  "tupleSize": 3\r
                },\r
                "select": 0,\r
                "values": [],\r
                "weights": [],\r
                "stringValue": "",\r
                "seed": 0\r
              }\r
            },\r
            {\r
              "id": "keepHi",\r
              "type": "setAttribute",\r
              "params": {\r
                "name": "cellMax",\r
                "domain": "point",\r
                "type": "f32",\r
                "tupleSize": 3,\r
                "value": {\r
                  "fn": "attribute",\r
                  "name": "boundsMax",\r
                  "tupleSize": 3\r
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
                "name": "cutFrac",\r
                "domain": "point",\r
                "type": "f32",\r
                "tupleSize": 1,\r
                "value": {\r
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
                "select": 0,\r
                "values": [],\r
                "weights": [],\r
                "stringValue": "",\r
                "seed": 0\r
              }\r
            },\r
            {\r
              "id": "halves",\r
              "type": "copyToPoints",\r
              "params": {\r
                "targetNames": [\r
                  "cellMin",\r
                  "cellMax",\r
                  "depth",\r
                  "cutFrac"\r
                ],\r
                "targetIndexAttr": "",\r
                "sourceGroupAttr": "",\r
                "targetGroupAttr": "",\r
                "topology": "drop"\r
              }\r
            },\r
            {\r
              "id": "slot",\r
              "type": "setAttribute",\r
              "params": {\r
                "name": "slot",\r
                "domain": "point",\r
                "type": "i32",\r
                "tupleSize": 1,\r
                "value": {\r
                  "fn": "mod",\r
                  "args": [\r
                    {\r
                      "fn": "index"\r
                    },\r
                    2\r
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
                                              "name": "cellMax",\r
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
                                              "name": "cellMin",\r
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
                                              "name": "cellMax",\r
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
                                              "name": "cellMin",\r
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
                                              "name": "cellMax",\r
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
                                              "name": "cellMin",\r
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
                                              "name": "cellMax",\r
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
                                              "name": "cellMin",\r
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
                              "fn": "attribute",\r
                              "name": "slot"\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "add",\r
                          "args": [\r
                            {\r
                              "fn": "add",\r
                              "args": [\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                      "fn": "component",\r
                                      "args": [\r
                                        {\r
                                          "fn": "attribute",\r
                                          "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                        },\r
                                        {\r
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "cellMin",\r
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
                                  "fn": "attribute",\r
                                  "name": "cutFrac"\r
                                },\r
                                {\r
                                  "fn": "add",\r
                                  "args": [\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                            {\r
                                              "fn": "component",\r
                                              "args": [\r
                                                {\r
                                                  "fn": "attribute",\r
                                                  "name": "cellMax",\r
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
                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                {\r
                                                  "fn": "component",\r
                                                  "args": [\r
                                                    {\r
                                                      "fn": "attribute",\r
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                              "name": "cellMax",\r
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
                                                                              "name": "cellMin",\r
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
                                                                              "name": "cellMax",\r
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
                                                                              "name": "cellMin",\r
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
                                                                              "name": "cellMax",\r
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
                                                                              "name": "cellMin",\r
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
                                                                              "name": "cellMax",\r
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
                                                                              "name": "cellMin",\r
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
                                            },\r
                                            {\r
                                              "fn": "sub",\r
                                              "args": [\r
                                                {\r
                                                  "fn": "component",\r
                                                  "args": [\r
                                                    {\r
                                                      "fn": "attribute",\r
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                        {\r
                          "fn": "component",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "cellMin",\r
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
                                                  "name": "cellMax",\r
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
                                                  "name": "cellMin",\r
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
                                                  "name": "cellMax",\r
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
                                                  "name": "cellMin",\r
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
                                                  "name": "cellMax",\r
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
                                                  "name": "cellMin",\r
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
                                                  "name": "cellMax",\r
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
                                                  "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                              "fn": "attribute",\r
                              "name": "slot"\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "add",\r
                          "args": [\r
                            {\r
                              "fn": "add",\r
                              "args": [\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                      "fn": "component",\r
                                      "args": [\r
                                        {\r
                                          "fn": "attribute",\r
                                          "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                        },\r
                                        {\r
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "cellMin",\r
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
                                  "fn": "attribute",\r
                                  "name": "cutFrac"\r
                                },\r
                                {\r
                                  "fn": "add",\r
                                  "args": [\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                            {\r
                                              "fn": "component",\r
                                              "args": [\r
                                                {\r
                                                  "fn": "attribute",\r
                                                  "name": "cellMax",\r
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
                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                {\r
                                                  "fn": "component",\r
                                                  "args": [\r
                                                    {\r
                                                      "fn": "attribute",\r
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                              "name": "cellMax",\r
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
                                                                              "name": "cellMin",\r
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
                                                                              "name": "cellMax",\r
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
                                                                              "name": "cellMin",\r
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
                                                                              "name": "cellMax",\r
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
                                                                              "name": "cellMin",\r
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
                                                                              "name": "cellMax",\r
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
                                                                              "name": "cellMin",\r
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
                                            },\r
                                            {\r
                                              "fn": "sub",\r
                                              "args": [\r
                                                {\r
                                                  "fn": "component",\r
                                                  "args": [\r
                                                    {\r
                                                      "fn": "attribute",\r
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                        {\r
                          "fn": "component",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                            },\r
                            {\r
                              "fn": "attribute",\r
                              "name": "slot"\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "add",\r
                          "args": [\r
                            {\r
                              "fn": "add",\r
                              "args": [\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                      "fn": "component",\r
                                      "args": [\r
                                        {\r
                                          "fn": "attribute",\r
                                          "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                        },\r
                                        {\r
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "cellMin",\r
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
                                  "fn": "attribute",\r
                                  "name": "cutFrac"\r
                                },\r
                                {\r
                                  "fn": "add",\r
                                  "args": [\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                            {\r
                                              "fn": "component",\r
                                              "args": [\r
                                                {\r
                                                  "fn": "attribute",\r
                                                  "name": "cellMax",\r
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
                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                {\r
                                                  "fn": "component",\r
                                                  "args": [\r
                                                    {\r
                                                      "fn": "attribute",\r
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                              "name": "cellMax",\r
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
                                                                              "name": "cellMin",\r
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
                                                                              "name": "cellMax",\r
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
                                                                              "name": "cellMin",\r
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
                                                                              "name": "cellMax",\r
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
                                                                              "name": "cellMin",\r
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
                                                                              "name": "cellMax",\r
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
                                                                              "name": "cellMin",\r
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
                                            },\r
                                            {\r
                                              "fn": "sub",\r
                                              "args": [\r
                                                {\r
                                                  "fn": "component",\r
                                                  "args": [\r
                                                    {\r
                                                      "fn": "attribute",\r
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                        {\r
                          "fn": "component",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "cellMin",\r
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
                                              "name": "cellMax",\r
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
                                              "name": "cellMin",\r
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
                                              "name": "cellMax",\r
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
                                              "name": "cellMin",\r
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
                                              "name": "cellMax",\r
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
                                              "name": "cellMin",\r
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
                                              "name": "cellMax",\r
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
                                              "name": "cellMin",\r
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
                                  "fn": "attribute",\r
                                  "name": "slot"\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "add",\r
                          "args": [\r
                            {\r
                              "fn": "add",\r
                              "args": [\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                      "fn": "component",\r
                                      "args": [\r
                                        {\r
                                          "fn": "attribute",\r
                                          "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                        },\r
                                        {\r
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "cellMin",\r
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
                                  "fn": "attribute",\r
                                  "name": "cutFrac"\r
                                },\r
                                {\r
                                  "fn": "add",\r
                                  "args": [\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                            {\r
                                              "fn": "component",\r
                                              "args": [\r
                                                {\r
                                                  "fn": "attribute",\r
                                                  "name": "cellMax",\r
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
                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                {\r
                                                  "fn": "component",\r
                                                  "args": [\r
                                                    {\r
                                                      "fn": "attribute",\r
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                              "name": "cellMax",\r
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
                                                                              "name": "cellMin",\r
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
                                                                              "name": "cellMax",\r
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
                                                                              "name": "cellMin",\r
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
                                                                              "name": "cellMax",\r
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
                                                                              "name": "cellMin",\r
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
                                                                              "name": "cellMax",\r
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
                                                                              "name": "cellMin",\r
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
                                            },\r
                                            {\r
                                              "fn": "sub",\r
                                              "args": [\r
                                                {\r
                                                  "fn": "component",\r
                                                  "args": [\r
                                                    {\r
                                                      "fn": "attribute",\r
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                        {\r
                          "fn": "component",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "cellMax",\r
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
                                                  "name": "cellMax",\r
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
                                                  "name": "cellMin",\r
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
                                                  "name": "cellMax",\r
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
                                                  "name": "cellMin",\r
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
                                                  "name": "cellMax",\r
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
                                                  "name": "cellMin",\r
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
                                                  "name": "cellMax",\r
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
                                                  "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                  "fn": "attribute",\r
                                  "name": "slot"\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "add",\r
                          "args": [\r
                            {\r
                              "fn": "add",\r
                              "args": [\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                      "fn": "component",\r
                                      "args": [\r
                                        {\r
                                          "fn": "attribute",\r
                                          "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                        },\r
                                        {\r
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "cellMin",\r
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
                                  "fn": "attribute",\r
                                  "name": "cutFrac"\r
                                },\r
                                {\r
                                  "fn": "add",\r
                                  "args": [\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                            {\r
                                              "fn": "component",\r
                                              "args": [\r
                                                {\r
                                                  "fn": "attribute",\r
                                                  "name": "cellMax",\r
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
                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                {\r
                                                  "fn": "component",\r
                                                  "args": [\r
                                                    {\r
                                                      "fn": "attribute",\r
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                              "name": "cellMax",\r
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
                                                                              "name": "cellMin",\r
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
                                                                              "name": "cellMax",\r
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
                                                                              "name": "cellMin",\r
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
                                                                              "name": "cellMax",\r
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
                                                                              "name": "cellMin",\r
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
                                                                              "name": "cellMax",\r
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
                                                                              "name": "cellMin",\r
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
                                            },\r
                                            {\r
                                              "fn": "sub",\r
                                              "args": [\r
                                                {\r
                                                  "fn": "component",\r
                                                  "args": [\r
                                                    {\r
                                                      "fn": "attribute",\r
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                        {\r
                          "fn": "component",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "cellMax",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                          "fn": "add",\r
                          "args": [\r
                            {\r
                              "fn": "add",\r
                              "args": [\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                      "fn": "component",\r
                                      "args": [\r
                                        {\r
                                          "fn": "attribute",\r
                                          "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                                                              "name": "cellMax",\r
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
                                                              "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                        },\r
                                        {\r
                                          "fn": "component",\r
                                          "args": [\r
                                            {\r
                                              "fn": "attribute",\r
                                              "name": "cellMin",\r
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
                                  "fn": "attribute",\r
                                  "name": "cutFrac"\r
                                },\r
                                {\r
                                  "fn": "add",\r
                                  "args": [\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                                          "name": "cellMax",\r
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
                                                          "name": "cellMin",\r
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
                                            {\r
                                              "fn": "component",\r
                                              "args": [\r
                                                {\r
                                                  "fn": "attribute",\r
                                                  "name": "cellMax",\r
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
                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                  "name": "cellMax",\r
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
                                                                  "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                {\r
                                                  "fn": "component",\r
                                                  "args": [\r
                                                    {\r
                                                      "fn": "attribute",\r
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                      "name": "cellMax",\r
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
                                                                      "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                          "name": "cellMax",\r
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
                                                                          "name": "cellMin",\r
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
                                                                              "name": "cellMax",\r
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
                                                                              "name": "cellMin",\r
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
                                                                              "name": "cellMax",\r
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
                                                                              "name": "cellMin",\r
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
                                                                              "name": "cellMax",\r
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
                                                                              "name": "cellMin",\r
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
                                                                              "name": "cellMax",\r
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
                                                                              "name": "cellMin",\r
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
                                            },\r
                                            {\r
                                              "fn": "sub",\r
                                              "args": [\r
                                                {\r
                                                  "fn": "component",\r
                                                  "args": [\r
                                                    {\r
                                                      "fn": "attribute",\r
                                                      "name": "cellMax",\r
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
                                                      "name": "cellMin",\r
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
                        {\r
                          "fn": "component",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "cellMax",\r
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
                          "fn": "max",\r
                          "args": [\r
                            {\r
                              "fn": "max",\r
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
                        1.7\r
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
                "keepLo",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "keepLo",\r
                "out"\r
              ],\r
              "to": [\r
                "keepHi",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "keepHi",\r
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
                "target"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "halves",\r
                "out"\r
              ],\r
              "to": [\r
                "slot",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "slot",\r
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
          },\r
          {\r
            "name": "rules",\r
            "node": "halves",\r
            "pin": "source"\r
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
      "id": "panelSize",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "scale",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 3,\r
        "value": {\r
          "fn": "mul",\r
          "args": [\r
            0.86,\r
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
      "id": "panels",\r
      "type": "copyToPoints",\r
      "params": {\r
        "targetNames": [],\r
        "targetIndexAttr": "",\r
        "sourceGroupAttr": "",\r
        "targetGroupAttr": "",\r
        "topology": "keep"\r
      }\r
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
        "rules",\r
        "out"\r
      ],\r
      "to": [\r
        "ruleP",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "ruleP",\r
        "out"\r
      ],\r
      "to": [\r
        "ruleSeed",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "ruleSeed",\r
        "out"\r
      ],\r
      "to": [\r
        "split",\r
        "rules"\r
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
        "panelSize",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "unitBox",\r
        "out"\r
      ],\r
      "to": [\r
        "panels",\r
        "source"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "panelSize",\r
        "out"\r
      ],\r
      "to": [\r
        "panels",\r
        "target"\r
      ]\r
    }\r
  ],\r
  "outputs": [\r
    {\r
      "id": "panels",\r
      "pin": "out",\r
      "name": "panels"\r
    }\r
  ]\r
}\r
`;export{e as default};