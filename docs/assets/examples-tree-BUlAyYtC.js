var e=`{\r
  "formatVersion": 1,\r
  "seed": 2201,\r
  "meta": {\r
    "title": "grow a tree by rewriting a point cloud",\r
    "description": "GROWTH AS A FIXED POINT, because this library has no recursion: a subgraph may not reference itself, so a structure that grows is spelled as a loop whose body REWRITES the whole cloud and whose carry is the structure so far. \`repeatUntil\` feeds each round's carry output back to its carry input, and the body is free to emit MORE points than it received -- that is what makes it a growth grammar rather than the relaxation loop it is usually reached for. Each round: take the points marked \`active\` (the buds), stamp the rule cloud on them to fan each bud out into three children, decide where each child goes, kill the ones the rules reject, mark the parents inactive and merge. The loop stops when no bud is left. THE RULE IS \`copyToPoints\` and the rule cloud is three coincident points at the origin, which is a fan-out multiplier and nothing else -- slot 0 continues the current branch, slots 1 and 2 are candidate branches. \`slot\` is recoverable as \`mod(index, 3)\` ONLY because copies land in contiguous per-target blocks, so it must be written before anything filters and renumbers. The three rule points need DISTINCT SEEDS: a copy's seed is hashCombine(source, target), per-point randomness keys on identity (stored position plus \`seed\`), and three children of one bud share a position until they are moved -- with equal rule seeds they would draw identically and the three slots would go the same way. DIRECTION is where a tree is won or lost. A continuation keeps the parent direction and wanders slightly; a branch mostly DISCARDS it and leaves sideways. One shared rule does not work: the gravity term then dominates every child and the result is a bundle of near-parallel whips, which is what this graph produced before the two cases were split. THE SEED IS NOT ROTATED PER ROUND, by design -- a fixed point exists only if the body is the same function every round -- and nothing here needs it to be. Randomness keys on IDENTITY, and every child is a new point at a position no point held before, so fresh draws come from the data changing rather than from the seed moving. SETTLING is \`attributeReduce\` mode \`sum\` over the 0/1 \`active\` flag. Mode \`count\` is the trap: it reports the element count and ignores the attribute named, so over a carry that only grows it is never zero and the loop silently burns its whole budget and reports \`converged\` false. THE CARRY CANNOT FAN OUT. Exactly one node may be the carry input, so the round needs the tree twice -- once to filter for buds, once to mark the old points inactive -- and an identity \`transformPoints\` is the pass-through both read from. BRANCH IDS are packed, \`depth * 262144 + parentIdx * 4 + slot\`, so the two candidate branches of one bud cannot collide. Every field resolves through f32, so the packing is exact only while it stays under 2^24: at this depth it is nowhere near, but a deeper tree or a wider round wants the bound rechecked rather than assumed. \`pointsToPath\` then groups on that id and orders on \`order\`, the position along a branch, with \`shortGroups: \\"skip\\"\` because a branch that never grew is data rather than an authoring error. WHAT IT COSTS: growth from ONE bud is exponential, so the early rounds decide everything and a tree that branches too late never gets going -- gated two segments up rather than one, this same graph settles at 19 points and 3 branches instead of 4213 and 1040. WHAT IT CANNOT DO: weld a junction. A branch's first point is its own, coincident with the parent it grew from but in a different group, so the two are separate polylines that meet by position rather than by sharing a vertex. Sharing it would need an edge built from a parent INDEX, which is the one thing no node here can author.",\r
    "tags": [\r
      "examples",\r
      "growth",\r
      "repeat",\r
      "paths"\r
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
      "id": "sDir",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "dir",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 3,\r
        "value": {\r
          "fn": "vec",\r
          "args": [\r
            0,\r
            1,\r
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
      "id": "sLen",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "len",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 1,\r
        "value": 4.5,\r
        "select": 0,\r
        "values": [],\r
        "weights": [],\r
        "stringValue": "",\r
        "seed": 0\r
      }\r
    },\r
    {\r
      "id": "sDepth",\r
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
      "id": "sBid",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "branchId",\r
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
      "id": "sOrd",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "order",\r
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
      "id": "sOn",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "active",\r
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
      "id": "rulePts",\r
      "type": "pointLine",\r
      "params": {\r
        "mode": "endpoints",\r
        "count": 3,\r
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
            101,\r
            {\r
              "fn": "mul",\r
              "args": [\r
                {\r
                  "fn": "index"\r
                },\r
                7919\r
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
      "id": "grow",\r
      "type": "repeatUntil",\r
      "params": {\r
        "maxRounds": 15,\r
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
              "id": "buds",\r
              "type": "filterByAttribute",\r
              "params": {\r
                "attribute": "active",\r
                "comparison": "eq",\r
                "value": 1,\r
                "topology": "drop"\r
              }\r
            },\r
            {\r
              "id": "kids",\r
              "type": "copyToPoints",\r
              "params": {\r
                "targetNames": [\r
                  "dir",\r
                  "len",\r
                  "depth",\r
                  "branchId",\r
                  "order"\r
                ],\r
                "targetIndexAttr": "parentIdx",\r
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
                    3\r
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
              "id": "depth",\r
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
              "id": "dir",\r
              "type": "setAttribute",\r
              "params": {\r
                "name": "dir",\r
                "domain": "point",\r
                "type": "f32",\r
                "tupleSize": 3,\r
                "value": {\r
                  "fn": "normalize",\r
                  "args": [\r
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
                                  "fn": "select",\r
                                  "args": [\r
                                    {\r
                                      "fn": "eq",\r
                                      "args": [\r
                                        {\r
                                          "fn": "attribute",\r
                                          "name": "slot"\r
                                        },\r
                                        0\r
                                      ]\r
                                    },\r
                                    1.0,\r
                                    0.3\r
                                  ]\r
                                },\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "dir",\r
                                  "tupleSize": 3\r
                                }\r
                              ]\r
                            },\r
                            {\r
                              "fn": "mul",\r
                              "args": [\r
                                {\r
                                  "fn": "select",\r
                                  "args": [\r
                                    {\r
                                      "fn": "eq",\r
                                      "args": [\r
                                        {\r
                                          "fn": "attribute",\r
                                          "name": "slot"\r
                                        },\r
                                        0\r
                                      ]\r
                                    },\r
                                    0.2,\r
                                    1.1\r
                                  ]\r
                                },\r
                                {\r
                                  "fn": "vec",\r
                                  "args": [\r
                                    {\r
                                      "fn": "sub",\r
                                      "args": [\r
                                        {\r
                                          "fn": "mul",\r
                                          "args": [\r
                                            2,\r
                                            {\r
                                              "fn": "randomField",\r
                                              "key": "dx"\r
                                            }\r
                                          ]\r
                                        },\r
                                        1\r
                                      ]\r
                                    },\r
                                    {\r
                                      "fn": "mul",\r
                                      "args": [\r
                                        0.45,\r
                                        {\r
                                          "fn": "sub",\r
                                          "args": [\r
                                            {\r
                                              "fn": "mul",\r
                                              "args": [\r
                                                2,\r
                                                {\r
                                                  "fn": "randomField",\r
                                                  "key": "dy"\r
                                                }\r
                                              ]\r
                                            },\r
                                            1\r
                                          ]\r
                                        }\r
                                      ]\r
                                    },\r
                                    {\r
                                      "fn": "sub",\r
                                      "args": [\r
                                        {\r
                                          "fn": "mul",\r
                                          "args": [\r
                                            2,\r
                                            {\r
                                              "fn": "randomField",\r
                                              "key": "dz"\r
                                            }\r
                                          ]\r
                                        },\r
                                        1\r
                                      ]\r
                                    }\r
                                  ]\r
                                }\r
                              ]\r
                            }\r
                          ]\r
                        },\r
                        {\r
                          "fn": "vec",\r
                          "args": [\r
                            0,\r
                            {\r
                              "fn": "select",\r
                              "args": [\r
                                {\r
                                  "fn": "eq",\r
                                  "args": [\r
                                    {\r
                                      "fn": "attribute",\r
                                      "name": "slot"\r
                                    },\r
                                    0\r
                                  ]\r
                                },\r
                                0.12,\r
                                0.16\r
                              ]\r
                            },\r
                            0\r
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
              "id": "len",\r
              "type": "setAttribute",\r
              "params": {\r
                "name": "len",\r
                "domain": "point",\r
                "type": "f32",\r
                "tupleSize": 1,\r
                "value": {\r
                  "fn": "mul",\r
                  "args": [\r
                    {\r
                      "fn": "attribute",\r
                      "name": "len"\r
                    },\r
                    0.86\r
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
              "id": "step",\r
              "type": "setAttribute",\r
              "params": {\r
                "name": "P",\r
                "domain": "point",\r
                "type": "f32",\r
                "tupleSize": 3,\r
                "value": {\r
                  "fn": "add",\r
                  "args": [\r
                    {\r
                      "fn": "attribute",\r
                      "name": "P",\r
                      "tupleSize": 3\r
                    },\r
                    {\r
                      "fn": "mul",\r
                      "args": [\r
                        {\r
                          "fn": "select",\r
                          "args": [\r
                            {\r
                              "fn": "eq",\r
                              "args": [\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "slot"\r
                                },\r
                                0\r
                              ]\r
                            },\r
                            {\r
                              "fn": "attribute",\r
                              "name": "len"\r
                            },\r
                            0\r
                          ]\r
                        },\r
                        {\r
                          "fn": "attribute",\r
                          "name": "dir",\r
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
              "id": "alive",\r
              "type": "filterByExpression",\r
              "params": {\r
                "topology": "drop",\r
                "seed": 0,\r
                "predicate": {\r
                  "fn": "mul",\r
                  "args": [\r
                    {\r
                      "fn": "lt",\r
                      "args": [\r
                        {\r
                          "fn": "attribute",\r
                          "name": "depth"\r
                        },\r
                        13\r
                      ]\r
                    },\r
                    {\r
                      "fn": "max",\r
                      "args": [\r
                        {\r
                          "fn": "eq",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "slot"\r
                            },\r
                            0\r
                          ]\r
                        },\r
                        {\r
                          "fn": "mul",\r
                          "args": [\r
                            {\r
                              "fn": "ge",\r
                              "args": [\r
                                {\r
                                  "fn": "randomField",\r
                                  "key": "br"\r
                                },\r
                                0.42\r
                              ]\r
                            },\r
                            {\r
                              "fn": "gt",\r
                              "args": [\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "depth"\r
                                },\r
                                1\r
                              ]\r
                            }\r
                          ]\r
                        }\r
                      ]\r
                    }\r
                  ]\r
                }\r
              }\r
            },\r
            {\r
              "id": "bid",\r
              "type": "setAttribute",\r
              "params": {\r
                "name": "branchId",\r
                "domain": "point",\r
                "type": "i32",\r
                "tupleSize": 1,\r
                "value": {\r
                  "fn": "select",\r
                  "args": [\r
                    {\r
                      "fn": "eq",\r
                      "args": [\r
                        {\r
                          "fn": "attribute",\r
                          "name": "slot"\r
                        },\r
                        0\r
                      ]\r
                    },\r
                    {\r
                      "fn": "attribute",\r
                      "name": "branchId"\r
                    },\r
                    {\r
                      "fn": "add",\r
                      "args": [\r
                        {\r
                          "fn": "mul",\r
                          "args": [\r
                            {\r
                              "fn": "attribute",\r
                              "name": "depth"\r
                            },\r
                            262144\r
                          ]\r
                        },\r
                        {\r
                          "fn": "add",\r
                          "args": [\r
                            {\r
                              "fn": "mul",\r
                              "args": [\r
                                {\r
                                  "fn": "attribute",\r
                                  "name": "parentIdx"\r
                                },\r
                                4\r
                              ]\r
                            },\r
                            {\r
                              "fn": "attribute",\r
                              "name": "slot"\r
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
              "id": "ord",\r
              "type": "setAttribute",\r
              "params": {\r
                "name": "order",\r
                "domain": "point",\r
                "type": "i32",\r
                "tupleSize": 1,\r
                "value": {\r
                  "fn": "select",\r
                  "args": [\r
                    {\r
                      "fn": "eq",\r
                      "args": [\r
                        {\r
                          "fn": "attribute",\r
                          "name": "slot"\r
                        },\r
                        0\r
                      ]\r
                    },\r
                    {\r
                      "fn": "add",\r
                      "args": [\r
                        {\r
                          "fn": "attribute",\r
                          "name": "order"\r
                        },\r
                        1\r
                      ]\r
                    },\r
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
              "id": "on",\r
              "type": "setAttribute",\r
              "params": {\r
                "name": "active",\r
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
              "id": "off",\r
              "type": "setAttribute",\r
              "params": {\r
                "name": "active",\r
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
                "name": "active",\r
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
                "buds",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "buds",\r
                "out"\r
              ],\r
              "to": [\r
                "kids",\r
                "target"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "kids",\r
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
                "depth",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "depth",\r
                "out"\r
              ],\r
              "to": [\r
                "dir",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "dir",\r
                "out"\r
              ],\r
              "to": [\r
                "len",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "len",\r
                "out"\r
              ],\r
              "to": [\r
                "step",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "step",\r
                "out"\r
              ],\r
              "to": [\r
                "alive",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "alive",\r
                "out"\r
              ],\r
              "to": [\r
                "bid",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "bid",\r
                "out"\r
              ],\r
              "to": [\r
                "ord",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "ord",\r
                "out"\r
              ],\r
              "to": [\r
                "on",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "pass",\r
                "out"\r
              ],\r
              "to": [\r
                "off",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "off",\r
                "out"\r
              ],\r
              "to": [\r
                "join",\r
                "in"\r
              ]\r
            },\r
            {\r
              "from": [\r
                "on",\r
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
            "node": "kids",\r
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
      "id": "branches",\r
      "type": "pointsToPath",\r
      "params": {\r
        "closed": false,\r
        "groupAttr": "branchId",\r
        "orderAttr": "order",\r
        "shortGroups": "skip"\r
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
        "sDir",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "sDir",\r
        "out"\r
      ],\r
      "to": [\r
        "sLen",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "sLen",\r
        "out"\r
      ],\r
      "to": [\r
        "sDepth",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "sDepth",\r
        "out"\r
      ],\r
      "to": [\r
        "sBid",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "sBid",\r
        "out"\r
      ],\r
      "to": [\r
        "sOrd",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "sOrd",\r
        "out"\r
      ],\r
      "to": [\r
        "sOn",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "sOn",\r
        "out"\r
      ],\r
      "to": [\r
        "grow",\r
        "carry"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "rulePts",\r
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
        "grow",\r
        "rules"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "grow",\r
        "carry"\r
      ],\r
      "to": [\r
        "branches",\r
        "in"\r
      ]\r
    }\r
  ],\r
  "outputs": [\r
    {\r
      "id": "branches",\r
      "pin": "out",\r
      "name": "tree"\r
    }\r
  ]\r
}\r
`;export{e as default};