var e=`{\r
  "formatVersion": 1,\r
  "seed": 2203,\r
  "meta": {\r
    "title": "Split a box until the pieces are small enough",\r
    "description": "RECURSIVE SUBDIVISION WITHOUT RECURSION, which is the third thing this corpus does with \`repeatUntil\` and the one that looks least like a loop. A split grammar is normally written as a function that calls itself on each half; a subgraph here may not reference itself, so the same structure is spelled as a loop whose carry is THE WHOLE SET OF CELLS and whose body replaces every open cell with its two halves. What comes back is the leaves -- the cells nothing wanted to split again -- and the tree that produced them is gone, which is exactly what a facade needs. A CELL IS A POINT, and the box it stands for is the \`boundsMin\`/\`boundsMax\` pair every point in this library already carries. Nothing new had to be represented: the standard bounds columns ARE the cell, \`setBounds\` is field-capable per point so the two halves are computed in one node, and the split rule is ordinary arithmetic over them. THE FAN-OUT IS \`repeatPoints\` WITH \`count\` 2: every open cell is emitted twice, the copies are numbered 0 and 1 in \`slot\`, and every column the cell has -- its box, its depth, the decisions already made on it -- rides onto both copies with no carry list to keep. The copies are coincident, so a child lands exactly on its parent and \`slot\` alone decides which half it becomes. THE SPLIT READS THE BOX THE CELL ARRIVED WITH, in the same node that rewrites it: \`setBounds\` resolves both corners against its input before writing either, so the field for one corner never sees the other corner this cook just wrote, and the parent's box needs no second copy under other names. THE AXIS IS ARGMAX OF THE THREE SPANS, and the grammar has no \`argmax\` and no \`and\` -- \`mul\` is AND on 0/1 predicates, so the x flag is \`ge(sx,sy) * ge(sx,sz)\` and the later flags subtract the ones already claimed, which makes the three mutually exclusive without a branch. They are written as one 0/1 vec3, \`axis\`. Splitting the LONGEST span is what keeps the cells from degenerating into slivers: split a fixed axis and every cell ends up as tall as the facade and a finger wide. It is also why this reads as a flat panel with no third dimension named anywhere -- the root box is 0.4 deep, so Z is never the longest span and never gets chosen. WHERE TO CUT IS THE PARENT'S DECISION, and it is the easiest thing here to get wrong. The two halves of one cell have DIFFERENT seeds -- \`repeatPoints\` gives copy k of a point the seed hashCombine(seed, k), which is what keeps coincident copies two points rather than one -- so a fraction drawn on each CHILD, after the fan-out, would come out different in the two halves and cut them at two different coordinates: one half would end at one, the other would begin at the other, and the strip between them would belong to neither half or to both. Nothing would fail: every cell would still be a valid box and the picture would still look like a subdivided panel. Measured on this graph at its own seed, with \`where\` moved after \`repeatPoints\`: 82.9 of the 360 square units would be covered by no leaf and 198.4 more would be covered more than once (128.4 square units lie under two or more leaves), the leaves summing to 475.5. That is not hypothetical history: the graph was first written, on \`copyToPoints\`, with the fraction drawn on the child. The rule is that a decision SHARED by the children is made on the parent and carried down, and only a decision that differs per child may be drawn after the fan-out. The axis and the cut are both shared, so \`axis\` and \`where\` write them on the open cell BEFORE \`repeatPoints\` -- \`where\` stores the cut as a coordinate, \`cutAt\`, the parent's low corner along the chosen axis plus a fraction in [0.34, 0.66) of its span -- and the split only reads them back: each component of each corner is \`select(axis_i * slot, cutAt, boundsMin_i)\` for the low corner and \`select(axis_i * (1 - slot), cutAt, boundsMax_i)\` for the high one, so the upper half's low corner and the lower half's high corner move to the cut on the chosen axis and everything else keeps the parent's value. Both halves read the one stored \`cutAt\`, so they meet at the same f32 coordinate and the leaves tile the root exactly -- no gap, no overlap, a summed area of 360 against a root of 360 -- which is the assertion worth making about a subdivision and the one a picture cannot make for you. Deciding on the parent is also what keeps the split small: the argmax and the cut are spelled once, where computing them inside \`setBounds\` would repeat the whole expression under every component of both corners. IT STOPS ON A SIZE FLOOR AND A DEPTH CAP: a cell stays open while its longest span exceeds 1.7 and its depth is under 9. The floor alone would end the loop -- each half keeps between 34% and 66% of the span it was cut from, so the longest span shrinks geometrically and no sliver can outrun it; with the cap removed and the round limit raised, every seed from 0 to 199 settles by depth 11 with at most 299 cells. The cap is a choice about the picture, not a guard against running forever: it binds in 198 of those 200 seeds, stopping about nine cells per facade (at most 18) while their longest span is still above 1.7, so the finest corners of the panel stop a split or two early. A depth cap alone would not do instead: it leaves the cells of a wide facade still wide. Settling sums the 0/1 \`live\` flag into the detail domain -- mode \`count\` reports the element count and ignores the attribute named, so over a set of cells that only grows it never reaches zero. WHAT IT IS NOT: a grammar. Every cell splits by the same rule, so this makes a Mondrian rather than a facade with a stated vocabulary of bays and openings. Giving a cell a KIND, and choosing the rule by that kind, is the next thing and wants \`byAttribute\` over a string; nothing here is in its way.",\r
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