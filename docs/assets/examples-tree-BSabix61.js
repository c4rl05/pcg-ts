var e=`{
  "formatVersion": 1,
  "seed": 2201,
  "meta": {
    "title": "grow a tree by rewriting a point cloud",
    "description": "GROWTH AS A FIXED POINT, because this library has no recursion: a subgraph may not reference itself, so a structure that grows is spelled as a loop whose body REWRITES the whole cloud and whose carry is the structure so far. \`repeatUntil\` feeds each round's carry output back to its carry input, and the body is free to emit MORE points than it received -- that is what makes it a growth grammar rather than the relaxation loop it is usually reached for. Each round: take the points marked \`active\` (the buds), stamp the rule cloud on them to fan each bud out into three children, decide where each child goes, kill the ones the rules reject, mark the parents inactive and merge. The loop stops when no bud is left. THE RULE IS \`copyToPoints\` and the rule cloud is three coincident points at the origin, which is a fan-out multiplier and nothing else -- slot 0 continues the current branch, slots 1 and 2 are candidate branches. \`slot\` is recoverable as \`mod(index, 3)\` ONLY because copies land in contiguous per-target blocks, so it must be written before anything filters and renumbers. The three rule points need DISTINCT SEEDS: a copy's seed is hashCombine(source, target), per-point randomness keys on identity (stored position plus \`seed\`), and three children of one bud share a position until they are moved -- with equal rule seeds they would draw identically and the three slots would go the same way. DIRECTION is where a tree is won or lost. A continuation keeps the parent direction and wanders slightly; a branch mostly DISCARDS it and leaves sideways. One shared rule does not work: the gravity term then dominates every child and the result is a bundle of near-parallel whips, which is what this graph produced before the two cases were split. THE SEED IS NOT ROTATED PER ROUND, by design -- a fixed point exists only if the body is the same function every round -- and nothing here needs it to be. Randomness keys on IDENTITY, and every child is a new point at a position no point held before, so fresh draws come from the data changing rather than from the seed moving. SETTLING is \`attributeReduce\` mode \`sum\` over the 0/1 \`active\` flag. Mode \`count\` is the trap: it reports the element count and ignores the attribute named, so over a carry that only grows it is never zero and the loop silently burns its whole budget and reports \`converged\` false. THE CARRY CANNOT FAN OUT. Exactly one node may be the carry input, so the round needs the tree twice -- once to filter for buds, once to mark the old points inactive -- and an identity \`transformPoints\` is the pass-through both read from. BRANCH IDS are packed, \`depth * 262144 + parentIdx * 4 + slot\`, so the two candidate branches of one bud cannot collide. Every field resolves through f32, so the packing is exact only while it stays under 2^24: at this depth it is nowhere near, but a deeper tree or a wider round wants the bound rechecked rather than assumed. \`pointsToPath\` then groups on that id and orders on \`order\`, the position along a branch, with \`shortGroups: \\"skip\\"\` because a branch that never grew is data rather than an authoring error. WHAT IT COSTS: growth from ONE bud is exponential, so the early rounds decide everything and a tree that branches too late never gets going -- gated two segments up rather than one, this same graph settles at 19 points and 3 branches instead of 4213 and 1040. WHAT IT CANNOT DO: weld a junction. A branch's first point is its own, coincident with the parent it grew from but in a different group, so the two are separate polylines that meet by position rather than by sharing a vertex. Sharing it would need an edge built from a parent INDEX, which is the one thing no node here can author.",
    "tags": [
      "examples",
      "growth",
      "repeat",
      "paths"
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
      "id": "sDir",
      "type": "setAttribute",
      "params": {
        "name": "dir",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "vec",
          "args": [
            0,
            1,
            0
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "sLen",
      "type": "setAttribute",
      "params": {
        "name": "len",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": 4.5,
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "sDepth",
      "type": "setAttribute",
      "params": {
        "name": "depth",
        "domain": "point",
        "type": "i32",
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
      "id": "sBid",
      "type": "setAttribute",
      "params": {
        "name": "branchId",
        "domain": "point",
        "type": "i32",
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
      "id": "sOrd",
      "type": "setAttribute",
      "params": {
        "name": "order",
        "domain": "point",
        "type": "i32",
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
      "id": "sOn",
      "type": "setAttribute",
      "params": {
        "name": "active",
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
      "id": "rulePts",
      "type": "pointLine",
      "params": {
        "mode": "endpoints",
        "count": 3,
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
      "id": "ruleP",
      "type": "setAttribute",
      "params": {
        "name": "P",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "vec",
          "args": [
            0,
            0,
            0
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "ruleSeed",
      "type": "setAttribute",
      "params": {
        "name": "seed",
        "domain": "point",
        "type": "u32",
        "tupleSize": 1,
        "value": {
          "fn": "add",
          "args": [
            101,
            {
              "fn": "mul",
              "args": [
                {
                  "fn": "index"
                },
                7919
              ]
            }
          ]
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "grow",
      "type": "repeatUntil",
      "params": {
        "maxRounds": 15,
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
              "id": "buds",
              "type": "filterByAttribute",
              "params": {
                "attribute": "active",
                "comparison": "eq",
                "value": 1,
                "topology": "drop"
              }
            },
            {
              "id": "kids",
              "type": "copyToPoints",
              "params": {
                "targetNames": [
                  "dir",
                  "len",
                  "depth",
                  "branchId",
                  "order"
                ],
                "targetIndexAttr": "parentIdx",
                "sourceGroupAttr": "",
                "targetGroupAttr": "",
                "topology": "drop"
              }
            },
            {
              "id": "slot",
              "type": "setAttribute",
              "params": {
                "name": "slot",
                "domain": "point",
                "type": "i32",
                "tupleSize": 1,
                "value": {
                  "fn": "mod",
                  "args": [
                    {
                      "fn": "index"
                    },
                    3
                  ]
                },
                "select": 0,
                "values": [],
                "weights": [],
                "stringValue": "",
                "seed": 0
              }
            },
            {
              "id": "depth",
              "type": "setAttribute",
              "params": {
                "name": "depth",
                "domain": "point",
                "type": "i32",
                "tupleSize": 1,
                "value": {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "depth"
                    },
                    1
                  ]
                },
                "select": 0,
                "values": [],
                "weights": [],
                "stringValue": "",
                "seed": 0
              }
            },
            {
              "id": "dir",
              "type": "setAttribute",
              "params": {
                "name": "dir",
                "domain": "point",
                "type": "f32",
                "tupleSize": 3,
                "value": {
                  "fn": "normalize",
                  "args": [
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "add",
                          "args": [
                            {
                              "fn": "mul",
                              "args": [
                                {
                                  "fn": "select",
                                  "args": [
                                    {
                                      "fn": "eq",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "slot"
                                        },
                                        0
                                      ]
                                    },
                                    1.0,
                                    0.3
                                  ]
                                },
                                {
                                  "fn": "attribute",
                                  "name": "dir",
                                  "tupleSize": 3
                                }
                              ]
                            },
                            {
                              "fn": "mul",
                              "args": [
                                {
                                  "fn": "select",
                                  "args": [
                                    {
                                      "fn": "eq",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "slot"
                                        },
                                        0
                                      ]
                                    },
                                    0.2,
                                    1.1
                                  ]
                                },
                                {
                                  "fn": "vec",
                                  "args": [
                                    {
                                      "fn": "sub",
                                      "args": [
                                        {
                                          "fn": "mul",
                                          "args": [
                                            2,
                                            {
                                              "fn": "randomField",
                                              "key": "dx"
                                            }
                                          ]
                                        },
                                        1
                                      ]
                                    },
                                    {
                                      "fn": "mul",
                                      "args": [
                                        0.45,
                                        {
                                          "fn": "sub",
                                          "args": [
                                            {
                                              "fn": "mul",
                                              "args": [
                                                2,
                                                {
                                                  "fn": "randomField",
                                                  "key": "dy"
                                                }
                                              ]
                                            },
                                            1
                                          ]
                                        }
                                      ]
                                    },
                                    {
                                      "fn": "sub",
                                      "args": [
                                        {
                                          "fn": "mul",
                                          "args": [
                                            2,
                                            {
                                              "fn": "randomField",
                                              "key": "dz"
                                            }
                                          ]
                                        },
                                        1
                                      ]
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        },
                        {
                          "fn": "vec",
                          "args": [
                            0,
                            {
                              "fn": "select",
                              "args": [
                                {
                                  "fn": "eq",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "slot"
                                    },
                                    0
                                  ]
                                },
                                0.12,
                                0.16
                              ]
                            },
                            0
                          ]
                        }
                      ]
                    }
                  ]
                },
                "select": 0,
                "values": [],
                "weights": [],
                "stringValue": "",
                "seed": 0
              }
            },
            {
              "id": "len",
              "type": "setAttribute",
              "params": {
                "name": "len",
                "domain": "point",
                "type": "f32",
                "tupleSize": 1,
                "value": {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "len"
                    },
                    0.86
                  ]
                },
                "select": 0,
                "values": [],
                "weights": [],
                "stringValue": "",
                "seed": 0
              }
            },
            {
              "id": "step",
              "type": "setAttribute",
              "params": {
                "name": "P",
                "domain": "point",
                "type": "f32",
                "tupleSize": 3,
                "value": {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "P",
                      "tupleSize": 3
                    },
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "select",
                          "args": [
                            {
                              "fn": "eq",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "slot"
                                },
                                0
                              ]
                            },
                            {
                              "fn": "attribute",
                              "name": "len"
                            },
                            0
                          ]
                        },
                        {
                          "fn": "attribute",
                          "name": "dir",
                          "tupleSize": 3
                        }
                      ]
                    }
                  ]
                },
                "select": 0,
                "values": [],
                "weights": [],
                "stringValue": "",
                "seed": 0
              }
            },
            {
              "id": "alive",
              "type": "filterByExpression",
              "params": {
                "topology": "drop",
                "seed": 0,
                "predicate": {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "lt",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "depth"
                        },
                        13
                      ]
                    },
                    {
                      "fn": "max",
                      "args": [
                        {
                          "fn": "eq",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "slot"
                            },
                            0
                          ]
                        },
                        {
                          "fn": "mul",
                          "args": [
                            {
                              "fn": "ge",
                              "args": [
                                {
                                  "fn": "randomField",
                                  "key": "br"
                                },
                                0.42
                              ]
                            },
                            {
                              "fn": "gt",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "depth"
                                },
                                1
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              }
            },
            {
              "id": "bid",
              "type": "setAttribute",
              "params": {
                "name": "branchId",
                "domain": "point",
                "type": "i32",
                "tupleSize": 1,
                "value": {
                  "fn": "select",
                  "args": [
                    {
                      "fn": "eq",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "slot"
                        },
                        0
                      ]
                    },
                    {
                      "fn": "attribute",
                      "name": "branchId"
                    },
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "mul",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "depth"
                            },
                            262144
                          ]
                        },
                        {
                          "fn": "add",
                          "args": [
                            {
                              "fn": "mul",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "parentIdx"
                                },
                                4
                              ]
                            },
                            {
                              "fn": "attribute",
                              "name": "slot"
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },
                "select": 0,
                "values": [],
                "weights": [],
                "stringValue": "",
                "seed": 0
              }
            },
            {
              "id": "ord",
              "type": "setAttribute",
              "params": {
                "name": "order",
                "domain": "point",
                "type": "i32",
                "tupleSize": 1,
                "value": {
                  "fn": "select",
                  "args": [
                    {
                      "fn": "eq",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "slot"
                        },
                        0
                      ]
                    },
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "order"
                        },
                        1
                      ]
                    },
                    0
                  ]
                },
                "select": 0,
                "values": [],
                "weights": [],
                "stringValue": "",
                "seed": 0
              }
            },
            {
              "id": "on",
              "type": "setAttribute",
              "params": {
                "name": "active",
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
              "id": "off",
              "type": "setAttribute",
              "params": {
                "name": "active",
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
                "name": "active",
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
                "buds",
                "in"
              ]
            },
            {
              "from": [
                "buds",
                "out"
              ],
              "to": [
                "kids",
                "target"
              ]
            },
            {
              "from": [
                "kids",
                "out"
              ],
              "to": [
                "slot",
                "in"
              ]
            },
            {
              "from": [
                "slot",
                "out"
              ],
              "to": [
                "depth",
                "in"
              ]
            },
            {
              "from": [
                "depth",
                "out"
              ],
              "to": [
                "dir",
                "in"
              ]
            },
            {
              "from": [
                "dir",
                "out"
              ],
              "to": [
                "len",
                "in"
              ]
            },
            {
              "from": [
                "len",
                "out"
              ],
              "to": [
                "step",
                "in"
              ]
            },
            {
              "from": [
                "step",
                "out"
              ],
              "to": [
                "alive",
                "in"
              ]
            },
            {
              "from": [
                "alive",
                "out"
              ],
              "to": [
                "bid",
                "in"
              ]
            },
            {
              "from": [
                "bid",
                "out"
              ],
              "to": [
                "ord",
                "in"
              ]
            },
            {
              "from": [
                "ord",
                "out"
              ],
              "to": [
                "on",
                "in"
              ]
            },
            {
              "from": [
                "pass",
                "out"
              ],
              "to": [
                "off",
                "in"
              ]
            },
            {
              "from": [
                "off",
                "out"
              ],
              "to": [
                "join",
                "in"
              ]
            },
            {
              "from": [
                "on",
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
            "name": "rules",
            "node": "kids",
            "pin": "source"
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
      "id": "branches",
      "type": "pointsToPath",
      "params": {
        "closed": false,
        "groupAttr": "branchId",
        "orderAttr": "order",
        "shortGroups": "skip"
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
        "sDir",
        "in"
      ]
    },
    {
      "from": [
        "sDir",
        "out"
      ],
      "to": [
        "sLen",
        "in"
      ]
    },
    {
      "from": [
        "sLen",
        "out"
      ],
      "to": [
        "sDepth",
        "in"
      ]
    },
    {
      "from": [
        "sDepth",
        "out"
      ],
      "to": [
        "sBid",
        "in"
      ]
    },
    {
      "from": [
        "sBid",
        "out"
      ],
      "to": [
        "sOrd",
        "in"
      ]
    },
    {
      "from": [
        "sOrd",
        "out"
      ],
      "to": [
        "sOn",
        "in"
      ]
    },
    {
      "from": [
        "sOn",
        "out"
      ],
      "to": [
        "grow",
        "carry"
      ]
    },
    {
      "from": [
        "rulePts",
        "out"
      ],
      "to": [
        "ruleP",
        "in"
      ]
    },
    {
      "from": [
        "ruleP",
        "out"
      ],
      "to": [
        "ruleSeed",
        "in"
      ]
    },
    {
      "from": [
        "ruleSeed",
        "out"
      ],
      "to": [
        "grow",
        "rules"
      ]
    },
    {
      "from": [
        "grow",
        "carry"
      ],
      "to": [
        "branches",
        "in"
      ]
    }
  ],
  "outputs": [
    {
      "id": "branches",
      "pin": "out",
      "name": "tree"
    }
  ]
}
`;export{e as default};