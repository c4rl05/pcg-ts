var e=`{
  "formatVersion": 1,
  "seed": 2203,
  "meta": {
    "title": "split a box until the pieces are small enough",
    "description": "RECURSIVE SUBDIVISION WITHOUT RECURSION, which is the third thing this corpus does with \`repeatUntil\` and the one that looks least like a loop. A split grammar is normally written as a function that calls itself on each half; a subgraph here may not reference itself, so the same structure is spelled as a loop whose carry is THE WHOLE SET OF CELLS and whose body replaces every open cell with its two halves. What comes back is the leaves -- the cells nothing wanted to split again -- and the tree that produced them is gone, which is exactly what a facade needs. A CELL IS A POINT, and the box it stands for is the \`boundsMin\`/\`boundsMax\` pair every point in this library already carries. Nothing new had to be represented: the standard bounds columns ARE the cell, \`setBounds\` is field-capable per point so the two halves can be computed in one node, and the split rule is ordinary arithmetic over them. THE AXIS IS ARGMAX OF THE THREE SPANS, and the grammar has no \`argmax\` and no \`and\` -- \`mul\` is AND on 0/1 predicates, so \`isX\` is \`ge(sx,sy) * ge(sx,sz)\` and the later flags subtract the ones already claimed, which makes the three mutually exclusive without a branch. Splitting the LONGEST span is what keeps the cells from degenerating into slivers: split a fixed axis and every cell ends up as tall as the facade and a finger wide. It is also why this reads as a flat panel with no third dimension named anywhere -- the root box is 0.4 deep, so Z is never the longest span and never gets chosen. THE PARENT'S CORNERS TRAVEL UNDER DIFFERENT NAMES, and that is not a stylistic choice. \`copyToPoints\` refuses to carry a target attribute the source already holds, and \`boundsMin\`/\`boundsMax\` are STANDARD columns, so the rule cloud carries its own pair and the parent's would collide. They are copied into \`cellMin\`/\`cellMax\` first and carried as those; the split then reads the copies and writes the real pair, so there is no round in which a half is computed from bounds another half already overwrote. WHERE TO CUT IS THE PARENT'S DECISION, and getting that wrong is the defect this graph was built with. The fraction started as a \`randomField\` read inside the split, on the child -- and the two halves of one cell have DIFFERENT seeds, so they drew different fractions and cut at two different coordinates. The lower half ended at one, the upper began at the other, and the sliver between them belonged to neither. Nothing failed: every cell was still a valid box, the picture still looked like a subdivided panel, and 23.1 of the 360 square units simply were not there. The rule is that a decision SHARED by the children is made on the parent and carried down, and only a decision that differs per child may be drawn after the fan-out. Cutting is shared, so \`cutFrac\` is written on the open cell before \`copyToPoints\` and travels in \`targetNames\`; the summed area of the leaves is then 360.0000 against a root of 360, which is the assertion worth making about a subdivision and the one a picture cannot make for you. THE RULE CLOUD IS A FAN-OUT AND NOTHING ELSE: two coincident points at the origin, so a child lands exactly on its parent and \`slot\` -- recoverable as \`mod(index, 2)\` only because copies arrive in contiguous per-target blocks -- decides which half it becomes. IT STOPS ON TWO CONDITIONS, both needed. A depth cap alone leaves the cells of a wide facade still wide; a size floor alone can be chased forever by a sliver the argmax keeps halving. Settling sums the 0/1 \`live\` flag into the detail domain -- mode \`count\` reports the element count and ignores the attribute named, so over a set of cells that only grows it never reaches zero. WHAT IT IS NOT: a grammar. Every cell splits by the same rule, so this makes a Mondrian rather than a facade with a stated vocabulary of bays and openings. Giving a cell a KIND, and choosing the rule by that kind, is the next thing and wants \`byAttribute\` over a string; nothing here is in its way.",
    "tags": [
      "examples",
      "structure",
      "repeat",
      "bounds"
    ]
  },
  "nodes": [
    {
      "id": "rootPt",
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
      "id": "rootCell",
      "type": "setBounds",
      "params": {
        "boundsMin": [
          -12.0,
          0,
          -0.2
        ],
        "boundsMax": [
          12.0,
          15.0,
          0.2
        ]
      }
    },
    {
      "id": "rootDepth",
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
      "id": "rootLive",
      "type": "setAttribute",
      "params": {
        "name": "live",
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
      "id": "rules",
      "type": "pointLine",
      "params": {
        "mode": "endpoints",
        "count": 2,
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
            17,
            {
              "fn": "mul",
              "args": [
                {
                  "fn": "index"
                },
                6151
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
      "id": "split",
      "type": "repeatUntil",
      "params": {
        "maxRounds": 11,
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
              "id": "open",
              "type": "filterByAttribute",
              "params": {
                "attribute": "live",
                "comparison": "eq",
                "value": 1,
                "topology": "drop"
              }
            },
            {
              "id": "keepLo",
              "type": "setAttribute",
              "params": {
                "name": "cellMin",
                "domain": "point",
                "type": "f32",
                "tupleSize": 3,
                "value": {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                },
                "select": 0,
                "values": [],
                "weights": [],
                "stringValue": "",
                "seed": 0
              }
            },
            {
              "id": "keepHi",
              "type": "setAttribute",
              "params": {
                "name": "cellMax",
                "domain": "point",
                "type": "f32",
                "tupleSize": 3,
                "value": {
                  "fn": "attribute",
                  "name": "boundsMax",
                  "tupleSize": 3
                },
                "select": 0,
                "values": [],
                "weights": [],
                "stringValue": "",
                "seed": 0
              }
            },
            {
              "id": "where",
              "type": "setAttribute",
              "params": {
                "name": "cutFrac",
                "domain": "point",
                "type": "f32",
                "tupleSize": 1,
                "value": {
                  "fn": "add",
                  "args": [
                    0.34,
                    {
                      "fn": "mul",
                      "args": [
                        0.32,
                        {
                          "fn": "randomField",
                          "key": "cut"
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
              "id": "halves",
              "type": "copyToPoints",
              "params": {
                "targetNames": [
                  "cellMin",
                  "cellMax",
                  "depth",
                  "cutFrac"
                ],
                "targetIndexAttr": "",
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
                    2
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
              "id": "deeper",
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
              "id": "cut",
              "type": "setBounds",
              "params": {
                "boundsMin": {
                  "fn": "vec",
                  "args": [
                    {
                      "fn": "select",
                      "args": [
                        {
                          "fn": "mul",
                          "args": [
                            {
                              "fn": "mul",
                              "args": [
                                {
                                  "fn": "ge",
                                  "args": [
                                    {
                                      "fn": "sub",
                                      "args": [
                                        {
                                          "fn": "component",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "cellMax",
                                              "tupleSize": 3
                                            }
                                          ],
                                          "index": 0
                                        },
                                        {
                                          "fn": "component",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "cellMin",
                                              "tupleSize": 3
                                            }
                                          ],
                                          "index": 0
                                        }
                                      ]
                                    },
                                    {
                                      "fn": "sub",
                                      "args": [
                                        {
                                          "fn": "component",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "cellMax",
                                              "tupleSize": 3
                                            }
                                          ],
                                          "index": 1
                                        },
                                        {
                                          "fn": "component",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "cellMin",
                                              "tupleSize": 3
                                            }
                                          ],
                                          "index": 1
                                        }
                                      ]
                                    }
                                  ]
                                },
                                {
                                  "fn": "ge",
                                  "args": [
                                    {
                                      "fn": "sub",
                                      "args": [
                                        {
                                          "fn": "component",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "cellMax",
                                              "tupleSize": 3
                                            }
                                          ],
                                          "index": 0
                                        },
                                        {
                                          "fn": "component",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "cellMin",
                                              "tupleSize": 3
                                            }
                                          ],
                                          "index": 0
                                        }
                                      ]
                                    },
                                    {
                                      "fn": "sub",
                                      "args": [
                                        {
                                          "fn": "component",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "cellMax",
                                              "tupleSize": 3
                                            }
                                          ],
                                          "index": 2
                                        },
                                        {
                                          "fn": "component",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "cellMin",
                                              "tupleSize": 3
                                            }
                                          ],
                                          "index": 2
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "fn": "attribute",
                              "name": "slot"
                            }
                          ]
                        },
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
                                      "fn": "mul",
                                      "args": [
                                        {
                                          "fn": "ge",
                                          "args": [
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "ge",
                                          "args": [
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                }
                                              ]
                                            }
                                          ]
                                        }
                                      ]
                                    },
                                    {
                                      "fn": "component",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "cellMin",
                                          "tupleSize": 3
                                        }
                                      ],
                                      "index": 0
                                    }
                                  ]
                                },
                                {
                                  "fn": "add",
                                  "args": [
                                    {
                                      "fn": "mul",
                                      "args": [
                                        {
                                          "fn": "mul",
                                          "args": [
                                            {
                                              "fn": "mul",
                                              "args": [
                                                {
                                                  "fn": "ge",
                                                  "args": [
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 1
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 1
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 0
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 0
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "ge",
                                                  "args": [
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 1
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 1
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 2
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 2
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                1,
                                                {
                                                  "fn": "mul",
                                                  "args": [
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "component",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "cellMin",
                                              "tupleSize": 3
                                            }
                                          ],
                                          "index": 1
                                        }
                                      ]
                                    },
                                    {
                                      "fn": "mul",
                                      "args": [
                                        {
                                          "fn": "sub",
                                          "args": [
                                            1,
                                            {
                                              "fn": "add",
                                              "args": [
                                                {
                                                  "fn": "mul",
                                                  "args": [
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "mul",
                                                  "args": [
                                                    {
                                                      "fn": "mul",
                                                      "args": [
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        1,
                                                        {
                                                          "fn": "mul",
                                                          "args": [
                                                            {
                                                              "fn": "ge",
                                                              "args": [
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    }
                                                                  ]
                                                                },
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    }
                                                                  ]
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "ge",
                                                              "args": [
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    }
                                                                  ]
                                                                },
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 2
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 2
                                                                    }
                                                                  ]
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "component",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "cellMin",
                                              "tupleSize": 3
                                            }
                                          ],
                                          "index": 2
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "fn": "mul",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "cutFrac"
                                },
                                {
                                  "fn": "add",
                                  "args": [
                                    {
                                      "fn": "mul",
                                      "args": [
                                        {
                                          "fn": "mul",
                                          "args": [
                                            {
                                              "fn": "ge",
                                              "args": [
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 0
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 0
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 1
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 1
                                                    }
                                                  ]
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "ge",
                                              "args": [
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 0
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 0
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 2
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 2
                                                    }
                                                  ]
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "sub",
                                          "args": [
                                            {
                                              "fn": "component",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "cellMax",
                                                  "tupleSize": 3
                                                }
                                              ],
                                              "index": 0
                                            },
                                            {
                                              "fn": "component",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "cellMin",
                                                  "tupleSize": 3
                                                }
                                              ],
                                              "index": 0
                                            }
                                          ]
                                        }
                                      ]
                                    },
                                    {
                                      "fn": "add",
                                      "args": [
                                        {
                                          "fn": "mul",
                                          "args": [
                                            {
                                              "fn": "mul",
                                              "args": [
                                                {
                                                  "fn": "mul",
                                                  "args": [
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    1,
                                                    {
                                                      "fn": "mul",
                                                      "args": [
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "mul",
                                          "args": [
                                            {
                                              "fn": "sub",
                                              "args": [
                                                1,
                                                {
                                                  "fn": "add",
                                                  "args": [
                                                    {
                                                      "fn": "mul",
                                                      "args": [
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "mul",
                                                      "args": [
                                                        {
                                                          "fn": "mul",
                                                          "args": [
                                                            {
                                                              "fn": "ge",
                                                              "args": [
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    }
                                                                  ]
                                                                },
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    }
                                                                  ]
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "ge",
                                                              "args": [
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    }
                                                                  ]
                                                                },
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 2
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 2
                                                                    }
                                                                  ]
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            1,
                                                            {
                                                              "fn": "mul",
                                                              "args": [
                                                                {
                                                                  "fn": "ge",
                                                                  "args": [
                                                                    {
                                                                      "fn": "sub",
                                                                      "args": [
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMax",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 0
                                                                        },
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMin",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 0
                                                                        }
                                                                      ]
                                                                    },
                                                                    {
                                                                      "fn": "sub",
                                                                      "args": [
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMax",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 1
                                                                        },
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMin",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 1
                                                                        }
                                                                      ]
                                                                    }
                                                                  ]
                                                                },
                                                                {
                                                                  "fn": "ge",
                                                                  "args": [
                                                                    {
                                                                      "fn": "sub",
                                                                      "args": [
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMax",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 0
                                                                        },
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMin",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 0
                                                                        }
                                                                      ]
                                                                    },
                                                                    {
                                                                      "fn": "sub",
                                                                      "args": [
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMax",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 2
                                                                        },
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMin",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 2
                                                                        }
                                                                      ]
                                                                    }
                                                                  ]
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                }
                                              ]
                                            }
                                          ]
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        },
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "cellMin",
                              "tupleSize": 3
                            }
                          ],
                          "index": 0
                        }
                      ]
                    },
                    {
                      "fn": "select",
                      "args": [
                        {
                          "fn": "mul",
                          "args": [
                            {
                              "fn": "mul",
                              "args": [
                                {
                                  "fn": "mul",
                                  "args": [
                                    {
                                      "fn": "ge",
                                      "args": [
                                        {
                                          "fn": "sub",
                                          "args": [
                                            {
                                              "fn": "component",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "cellMax",
                                                  "tupleSize": 3
                                                }
                                              ],
                                              "index": 1
                                            },
                                            {
                                              "fn": "component",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "cellMin",
                                                  "tupleSize": 3
                                                }
                                              ],
                                              "index": 1
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "sub",
                                          "args": [
                                            {
                                              "fn": "component",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "cellMax",
                                                  "tupleSize": 3
                                                }
                                              ],
                                              "index": 0
                                            },
                                            {
                                              "fn": "component",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "cellMin",
                                                  "tupleSize": 3
                                                }
                                              ],
                                              "index": 0
                                            }
                                          ]
                                        }
                                      ]
                                    },
                                    {
                                      "fn": "ge",
                                      "args": [
                                        {
                                          "fn": "sub",
                                          "args": [
                                            {
                                              "fn": "component",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "cellMax",
                                                  "tupleSize": 3
                                                }
                                              ],
                                              "index": 1
                                            },
                                            {
                                              "fn": "component",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "cellMin",
                                                  "tupleSize": 3
                                                }
                                              ],
                                              "index": 1
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "sub",
                                          "args": [
                                            {
                                              "fn": "component",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "cellMax",
                                                  "tupleSize": 3
                                                }
                                              ],
                                              "index": 2
                                            },
                                            {
                                              "fn": "component",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "cellMin",
                                                  "tupleSize": 3
                                                }
                                              ],
                                              "index": 2
                                            }
                                          ]
                                        }
                                      ]
                                    }
                                  ]
                                },
                                {
                                  "fn": "sub",
                                  "args": [
                                    1,
                                    {
                                      "fn": "mul",
                                      "args": [
                                        {
                                          "fn": "ge",
                                          "args": [
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "ge",
                                          "args": [
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                }
                                              ]
                                            }
                                          ]
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "fn": "attribute",
                              "name": "slot"
                            }
                          ]
                        },
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
                                      "fn": "mul",
                                      "args": [
                                        {
                                          "fn": "ge",
                                          "args": [
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "ge",
                                          "args": [
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                }
                                              ]
                                            }
                                          ]
                                        }
                                      ]
                                    },
                                    {
                                      "fn": "component",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "cellMin",
                                          "tupleSize": 3
                                        }
                                      ],
                                      "index": 0
                                    }
                                  ]
                                },
                                {
                                  "fn": "add",
                                  "args": [
                                    {
                                      "fn": "mul",
                                      "args": [
                                        {
                                          "fn": "mul",
                                          "args": [
                                            {
                                              "fn": "mul",
                                              "args": [
                                                {
                                                  "fn": "ge",
                                                  "args": [
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 1
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 1
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 0
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 0
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "ge",
                                                  "args": [
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 1
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 1
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 2
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 2
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                1,
                                                {
                                                  "fn": "mul",
                                                  "args": [
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "component",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "cellMin",
                                              "tupleSize": 3
                                            }
                                          ],
                                          "index": 1
                                        }
                                      ]
                                    },
                                    {
                                      "fn": "mul",
                                      "args": [
                                        {
                                          "fn": "sub",
                                          "args": [
                                            1,
                                            {
                                              "fn": "add",
                                              "args": [
                                                {
                                                  "fn": "mul",
                                                  "args": [
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "mul",
                                                  "args": [
                                                    {
                                                      "fn": "mul",
                                                      "args": [
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        1,
                                                        {
                                                          "fn": "mul",
                                                          "args": [
                                                            {
                                                              "fn": "ge",
                                                              "args": [
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    }
                                                                  ]
                                                                },
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    }
                                                                  ]
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "ge",
                                                              "args": [
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    }
                                                                  ]
                                                                },
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 2
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 2
                                                                    }
                                                                  ]
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "component",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "cellMin",
                                              "tupleSize": 3
                                            }
                                          ],
                                          "index": 2
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "fn": "mul",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "cutFrac"
                                },
                                {
                                  "fn": "add",
                                  "args": [
                                    {
                                      "fn": "mul",
                                      "args": [
                                        {
                                          "fn": "mul",
                                          "args": [
                                            {
                                              "fn": "ge",
                                              "args": [
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 0
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 0
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 1
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 1
                                                    }
                                                  ]
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "ge",
                                              "args": [
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 0
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 0
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 2
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 2
                                                    }
                                                  ]
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "sub",
                                          "args": [
                                            {
                                              "fn": "component",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "cellMax",
                                                  "tupleSize": 3
                                                }
                                              ],
                                              "index": 0
                                            },
                                            {
                                              "fn": "component",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "cellMin",
                                                  "tupleSize": 3
                                                }
                                              ],
                                              "index": 0
                                            }
                                          ]
                                        }
                                      ]
                                    },
                                    {
                                      "fn": "add",
                                      "args": [
                                        {
                                          "fn": "mul",
                                          "args": [
                                            {
                                              "fn": "mul",
                                              "args": [
                                                {
                                                  "fn": "mul",
                                                  "args": [
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    1,
                                                    {
                                                      "fn": "mul",
                                                      "args": [
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "mul",
                                          "args": [
                                            {
                                              "fn": "sub",
                                              "args": [
                                                1,
                                                {
                                                  "fn": "add",
                                                  "args": [
                                                    {
                                                      "fn": "mul",
                                                      "args": [
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "mul",
                                                      "args": [
                                                        {
                                                          "fn": "mul",
                                                          "args": [
                                                            {
                                                              "fn": "ge",
                                                              "args": [
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    }
                                                                  ]
                                                                },
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    }
                                                                  ]
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "ge",
                                                              "args": [
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    }
                                                                  ]
                                                                },
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 2
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 2
                                                                    }
                                                                  ]
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            1,
                                                            {
                                                              "fn": "mul",
                                                              "args": [
                                                                {
                                                                  "fn": "ge",
                                                                  "args": [
                                                                    {
                                                                      "fn": "sub",
                                                                      "args": [
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMax",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 0
                                                                        },
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMin",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 0
                                                                        }
                                                                      ]
                                                                    },
                                                                    {
                                                                      "fn": "sub",
                                                                      "args": [
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMax",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 1
                                                                        },
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMin",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 1
                                                                        }
                                                                      ]
                                                                    }
                                                                  ]
                                                                },
                                                                {
                                                                  "fn": "ge",
                                                                  "args": [
                                                                    {
                                                                      "fn": "sub",
                                                                      "args": [
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMax",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 0
                                                                        },
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMin",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 0
                                                                        }
                                                                      ]
                                                                    },
                                                                    {
                                                                      "fn": "sub",
                                                                      "args": [
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMax",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 2
                                                                        },
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMin",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 2
                                                                        }
                                                                      ]
                                                                    }
                                                                  ]
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                }
                                              ]
                                            }
                                          ]
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        },
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "cellMin",
                              "tupleSize": 3
                            }
                          ],
                          "index": 1
                        }
                      ]
                    },
                    {
                      "fn": "select",
                      "args": [
                        {
                          "fn": "mul",
                          "args": [
                            {
                              "fn": "sub",
                              "args": [
                                1,
                                {
                                  "fn": "add",
                                  "args": [
                                    {
                                      "fn": "mul",
                                      "args": [
                                        {
                                          "fn": "ge",
                                          "args": [
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "ge",
                                          "args": [
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                }
                                              ]
                                            }
                                          ]
                                        }
                                      ]
                                    },
                                    {
                                      "fn": "mul",
                                      "args": [
                                        {
                                          "fn": "mul",
                                          "args": [
                                            {
                                              "fn": "ge",
                                              "args": [
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 1
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 1
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 0
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 0
                                                    }
                                                  ]
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "ge",
                                              "args": [
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 1
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 1
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 2
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 2
                                                    }
                                                  ]
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "sub",
                                          "args": [
                                            1,
                                            {
                                              "fn": "mul",
                                              "args": [
                                                {
                                                  "fn": "ge",
                                                  "args": [
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 0
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 0
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 1
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 1
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "ge",
                                                  "args": [
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 0
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 0
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 2
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 2
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            }
                                          ]
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "fn": "attribute",
                              "name": "slot"
                            }
                          ]
                        },
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
                                      "fn": "mul",
                                      "args": [
                                        {
                                          "fn": "ge",
                                          "args": [
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "ge",
                                          "args": [
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                }
                                              ]
                                            }
                                          ]
                                        }
                                      ]
                                    },
                                    {
                                      "fn": "component",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "cellMin",
                                          "tupleSize": 3
                                        }
                                      ],
                                      "index": 0
                                    }
                                  ]
                                },
                                {
                                  "fn": "add",
                                  "args": [
                                    {
                                      "fn": "mul",
                                      "args": [
                                        {
                                          "fn": "mul",
                                          "args": [
                                            {
                                              "fn": "mul",
                                              "args": [
                                                {
                                                  "fn": "ge",
                                                  "args": [
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 1
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 1
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 0
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 0
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "ge",
                                                  "args": [
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 1
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 1
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 2
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 2
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                1,
                                                {
                                                  "fn": "mul",
                                                  "args": [
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "component",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "cellMin",
                                              "tupleSize": 3
                                            }
                                          ],
                                          "index": 1
                                        }
                                      ]
                                    },
                                    {
                                      "fn": "mul",
                                      "args": [
                                        {
                                          "fn": "sub",
                                          "args": [
                                            1,
                                            {
                                              "fn": "add",
                                              "args": [
                                                {
                                                  "fn": "mul",
                                                  "args": [
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "mul",
                                                  "args": [
                                                    {
                                                      "fn": "mul",
                                                      "args": [
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        1,
                                                        {
                                                          "fn": "mul",
                                                          "args": [
                                                            {
                                                              "fn": "ge",
                                                              "args": [
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    }
                                                                  ]
                                                                },
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    }
                                                                  ]
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "ge",
                                                              "args": [
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    }
                                                                  ]
                                                                },
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 2
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 2
                                                                    }
                                                                  ]
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "component",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "cellMin",
                                              "tupleSize": 3
                                            }
                                          ],
                                          "index": 2
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "fn": "mul",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "cutFrac"
                                },
                                {
                                  "fn": "add",
                                  "args": [
                                    {
                                      "fn": "mul",
                                      "args": [
                                        {
                                          "fn": "mul",
                                          "args": [
                                            {
                                              "fn": "ge",
                                              "args": [
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 0
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 0
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 1
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 1
                                                    }
                                                  ]
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "ge",
                                              "args": [
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 0
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 0
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 2
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 2
                                                    }
                                                  ]
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "sub",
                                          "args": [
                                            {
                                              "fn": "component",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "cellMax",
                                                  "tupleSize": 3
                                                }
                                              ],
                                              "index": 0
                                            },
                                            {
                                              "fn": "component",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "cellMin",
                                                  "tupleSize": 3
                                                }
                                              ],
                                              "index": 0
                                            }
                                          ]
                                        }
                                      ]
                                    },
                                    {
                                      "fn": "add",
                                      "args": [
                                        {
                                          "fn": "mul",
                                          "args": [
                                            {
                                              "fn": "mul",
                                              "args": [
                                                {
                                                  "fn": "mul",
                                                  "args": [
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    1,
                                                    {
                                                      "fn": "mul",
                                                      "args": [
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "mul",
                                          "args": [
                                            {
                                              "fn": "sub",
                                              "args": [
                                                1,
                                                {
                                                  "fn": "add",
                                                  "args": [
                                                    {
                                                      "fn": "mul",
                                                      "args": [
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "mul",
                                                      "args": [
                                                        {
                                                          "fn": "mul",
                                                          "args": [
                                                            {
                                                              "fn": "ge",
                                                              "args": [
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    }
                                                                  ]
                                                                },
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    }
                                                                  ]
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "ge",
                                                              "args": [
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    }
                                                                  ]
                                                                },
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 2
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 2
                                                                    }
                                                                  ]
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            1,
                                                            {
                                                              "fn": "mul",
                                                              "args": [
                                                                {
                                                                  "fn": "ge",
                                                                  "args": [
                                                                    {
                                                                      "fn": "sub",
                                                                      "args": [
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMax",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 0
                                                                        },
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMin",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 0
                                                                        }
                                                                      ]
                                                                    },
                                                                    {
                                                                      "fn": "sub",
                                                                      "args": [
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMax",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 1
                                                                        },
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMin",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 1
                                                                        }
                                                                      ]
                                                                    }
                                                                  ]
                                                                },
                                                                {
                                                                  "fn": "ge",
                                                                  "args": [
                                                                    {
                                                                      "fn": "sub",
                                                                      "args": [
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMax",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 0
                                                                        },
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMin",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 0
                                                                        }
                                                                      ]
                                                                    },
                                                                    {
                                                                      "fn": "sub",
                                                                      "args": [
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMax",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 2
                                                                        },
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMin",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 2
                                                                        }
                                                                      ]
                                                                    }
                                                                  ]
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                }
                                              ]
                                            }
                                          ]
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        },
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "cellMin",
                              "tupleSize": 3
                            }
                          ],
                          "index": 2
                        }
                      ]
                    }
                  ]
                },
                "boundsMax": {
                  "fn": "vec",
                  "args": [
                    {
                      "fn": "select",
                      "args": [
                        {
                          "fn": "mul",
                          "args": [
                            {
                              "fn": "mul",
                              "args": [
                                {
                                  "fn": "ge",
                                  "args": [
                                    {
                                      "fn": "sub",
                                      "args": [
                                        {
                                          "fn": "component",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "cellMax",
                                              "tupleSize": 3
                                            }
                                          ],
                                          "index": 0
                                        },
                                        {
                                          "fn": "component",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "cellMin",
                                              "tupleSize": 3
                                            }
                                          ],
                                          "index": 0
                                        }
                                      ]
                                    },
                                    {
                                      "fn": "sub",
                                      "args": [
                                        {
                                          "fn": "component",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "cellMax",
                                              "tupleSize": 3
                                            }
                                          ],
                                          "index": 1
                                        },
                                        {
                                          "fn": "component",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "cellMin",
                                              "tupleSize": 3
                                            }
                                          ],
                                          "index": 1
                                        }
                                      ]
                                    }
                                  ]
                                },
                                {
                                  "fn": "ge",
                                  "args": [
                                    {
                                      "fn": "sub",
                                      "args": [
                                        {
                                          "fn": "component",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "cellMax",
                                              "tupleSize": 3
                                            }
                                          ],
                                          "index": 0
                                        },
                                        {
                                          "fn": "component",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "cellMin",
                                              "tupleSize": 3
                                            }
                                          ],
                                          "index": 0
                                        }
                                      ]
                                    },
                                    {
                                      "fn": "sub",
                                      "args": [
                                        {
                                          "fn": "component",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "cellMax",
                                              "tupleSize": 3
                                            }
                                          ],
                                          "index": 2
                                        },
                                        {
                                          "fn": "component",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "cellMin",
                                              "tupleSize": 3
                                            }
                                          ],
                                          "index": 2
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "fn": "sub",
                              "args": [
                                1,
                                {
                                  "fn": "attribute",
                                  "name": "slot"
                                }
                              ]
                            }
                          ]
                        },
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
                                      "fn": "mul",
                                      "args": [
                                        {
                                          "fn": "ge",
                                          "args": [
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "ge",
                                          "args": [
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                }
                                              ]
                                            }
                                          ]
                                        }
                                      ]
                                    },
                                    {
                                      "fn": "component",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "cellMin",
                                          "tupleSize": 3
                                        }
                                      ],
                                      "index": 0
                                    }
                                  ]
                                },
                                {
                                  "fn": "add",
                                  "args": [
                                    {
                                      "fn": "mul",
                                      "args": [
                                        {
                                          "fn": "mul",
                                          "args": [
                                            {
                                              "fn": "mul",
                                              "args": [
                                                {
                                                  "fn": "ge",
                                                  "args": [
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 1
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 1
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 0
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 0
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "ge",
                                                  "args": [
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 1
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 1
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 2
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 2
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                1,
                                                {
                                                  "fn": "mul",
                                                  "args": [
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "component",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "cellMin",
                                              "tupleSize": 3
                                            }
                                          ],
                                          "index": 1
                                        }
                                      ]
                                    },
                                    {
                                      "fn": "mul",
                                      "args": [
                                        {
                                          "fn": "sub",
                                          "args": [
                                            1,
                                            {
                                              "fn": "add",
                                              "args": [
                                                {
                                                  "fn": "mul",
                                                  "args": [
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "mul",
                                                  "args": [
                                                    {
                                                      "fn": "mul",
                                                      "args": [
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        1,
                                                        {
                                                          "fn": "mul",
                                                          "args": [
                                                            {
                                                              "fn": "ge",
                                                              "args": [
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    }
                                                                  ]
                                                                },
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    }
                                                                  ]
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "ge",
                                                              "args": [
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    }
                                                                  ]
                                                                },
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 2
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 2
                                                                    }
                                                                  ]
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "component",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "cellMin",
                                              "tupleSize": 3
                                            }
                                          ],
                                          "index": 2
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "fn": "mul",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "cutFrac"
                                },
                                {
                                  "fn": "add",
                                  "args": [
                                    {
                                      "fn": "mul",
                                      "args": [
                                        {
                                          "fn": "mul",
                                          "args": [
                                            {
                                              "fn": "ge",
                                              "args": [
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 0
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 0
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 1
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 1
                                                    }
                                                  ]
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "ge",
                                              "args": [
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 0
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 0
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 2
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 2
                                                    }
                                                  ]
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "sub",
                                          "args": [
                                            {
                                              "fn": "component",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "cellMax",
                                                  "tupleSize": 3
                                                }
                                              ],
                                              "index": 0
                                            },
                                            {
                                              "fn": "component",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "cellMin",
                                                  "tupleSize": 3
                                                }
                                              ],
                                              "index": 0
                                            }
                                          ]
                                        }
                                      ]
                                    },
                                    {
                                      "fn": "add",
                                      "args": [
                                        {
                                          "fn": "mul",
                                          "args": [
                                            {
                                              "fn": "mul",
                                              "args": [
                                                {
                                                  "fn": "mul",
                                                  "args": [
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    1,
                                                    {
                                                      "fn": "mul",
                                                      "args": [
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "mul",
                                          "args": [
                                            {
                                              "fn": "sub",
                                              "args": [
                                                1,
                                                {
                                                  "fn": "add",
                                                  "args": [
                                                    {
                                                      "fn": "mul",
                                                      "args": [
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "mul",
                                                      "args": [
                                                        {
                                                          "fn": "mul",
                                                          "args": [
                                                            {
                                                              "fn": "ge",
                                                              "args": [
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    }
                                                                  ]
                                                                },
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    }
                                                                  ]
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "ge",
                                                              "args": [
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    }
                                                                  ]
                                                                },
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 2
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 2
                                                                    }
                                                                  ]
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            1,
                                                            {
                                                              "fn": "mul",
                                                              "args": [
                                                                {
                                                                  "fn": "ge",
                                                                  "args": [
                                                                    {
                                                                      "fn": "sub",
                                                                      "args": [
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMax",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 0
                                                                        },
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMin",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 0
                                                                        }
                                                                      ]
                                                                    },
                                                                    {
                                                                      "fn": "sub",
                                                                      "args": [
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMax",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 1
                                                                        },
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMin",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 1
                                                                        }
                                                                      ]
                                                                    }
                                                                  ]
                                                                },
                                                                {
                                                                  "fn": "ge",
                                                                  "args": [
                                                                    {
                                                                      "fn": "sub",
                                                                      "args": [
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMax",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 0
                                                                        },
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMin",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 0
                                                                        }
                                                                      ]
                                                                    },
                                                                    {
                                                                      "fn": "sub",
                                                                      "args": [
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMax",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 2
                                                                        },
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMin",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 2
                                                                        }
                                                                      ]
                                                                    }
                                                                  ]
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                }
                                              ]
                                            }
                                          ]
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        },
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "cellMax",
                              "tupleSize": 3
                            }
                          ],
                          "index": 0
                        }
                      ]
                    },
                    {
                      "fn": "select",
                      "args": [
                        {
                          "fn": "mul",
                          "args": [
                            {
                              "fn": "mul",
                              "args": [
                                {
                                  "fn": "mul",
                                  "args": [
                                    {
                                      "fn": "ge",
                                      "args": [
                                        {
                                          "fn": "sub",
                                          "args": [
                                            {
                                              "fn": "component",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "cellMax",
                                                  "tupleSize": 3
                                                }
                                              ],
                                              "index": 1
                                            },
                                            {
                                              "fn": "component",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "cellMin",
                                                  "tupleSize": 3
                                                }
                                              ],
                                              "index": 1
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "sub",
                                          "args": [
                                            {
                                              "fn": "component",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "cellMax",
                                                  "tupleSize": 3
                                                }
                                              ],
                                              "index": 0
                                            },
                                            {
                                              "fn": "component",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "cellMin",
                                                  "tupleSize": 3
                                                }
                                              ],
                                              "index": 0
                                            }
                                          ]
                                        }
                                      ]
                                    },
                                    {
                                      "fn": "ge",
                                      "args": [
                                        {
                                          "fn": "sub",
                                          "args": [
                                            {
                                              "fn": "component",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "cellMax",
                                                  "tupleSize": 3
                                                }
                                              ],
                                              "index": 1
                                            },
                                            {
                                              "fn": "component",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "cellMin",
                                                  "tupleSize": 3
                                                }
                                              ],
                                              "index": 1
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "sub",
                                          "args": [
                                            {
                                              "fn": "component",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "cellMax",
                                                  "tupleSize": 3
                                                }
                                              ],
                                              "index": 2
                                            },
                                            {
                                              "fn": "component",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "cellMin",
                                                  "tupleSize": 3
                                                }
                                              ],
                                              "index": 2
                                            }
                                          ]
                                        }
                                      ]
                                    }
                                  ]
                                },
                                {
                                  "fn": "sub",
                                  "args": [
                                    1,
                                    {
                                      "fn": "mul",
                                      "args": [
                                        {
                                          "fn": "ge",
                                          "args": [
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "ge",
                                          "args": [
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                }
                                              ]
                                            }
                                          ]
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "fn": "sub",
                              "args": [
                                1,
                                {
                                  "fn": "attribute",
                                  "name": "slot"
                                }
                              ]
                            }
                          ]
                        },
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
                                      "fn": "mul",
                                      "args": [
                                        {
                                          "fn": "ge",
                                          "args": [
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "ge",
                                          "args": [
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                }
                                              ]
                                            }
                                          ]
                                        }
                                      ]
                                    },
                                    {
                                      "fn": "component",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "cellMin",
                                          "tupleSize": 3
                                        }
                                      ],
                                      "index": 0
                                    }
                                  ]
                                },
                                {
                                  "fn": "add",
                                  "args": [
                                    {
                                      "fn": "mul",
                                      "args": [
                                        {
                                          "fn": "mul",
                                          "args": [
                                            {
                                              "fn": "mul",
                                              "args": [
                                                {
                                                  "fn": "ge",
                                                  "args": [
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 1
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 1
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 0
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 0
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "ge",
                                                  "args": [
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 1
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 1
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 2
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 2
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                1,
                                                {
                                                  "fn": "mul",
                                                  "args": [
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "component",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "cellMin",
                                              "tupleSize": 3
                                            }
                                          ],
                                          "index": 1
                                        }
                                      ]
                                    },
                                    {
                                      "fn": "mul",
                                      "args": [
                                        {
                                          "fn": "sub",
                                          "args": [
                                            1,
                                            {
                                              "fn": "add",
                                              "args": [
                                                {
                                                  "fn": "mul",
                                                  "args": [
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "mul",
                                                  "args": [
                                                    {
                                                      "fn": "mul",
                                                      "args": [
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        1,
                                                        {
                                                          "fn": "mul",
                                                          "args": [
                                                            {
                                                              "fn": "ge",
                                                              "args": [
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    }
                                                                  ]
                                                                },
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    }
                                                                  ]
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "ge",
                                                              "args": [
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    }
                                                                  ]
                                                                },
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 2
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 2
                                                                    }
                                                                  ]
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "component",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "cellMin",
                                              "tupleSize": 3
                                            }
                                          ],
                                          "index": 2
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "fn": "mul",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "cutFrac"
                                },
                                {
                                  "fn": "add",
                                  "args": [
                                    {
                                      "fn": "mul",
                                      "args": [
                                        {
                                          "fn": "mul",
                                          "args": [
                                            {
                                              "fn": "ge",
                                              "args": [
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 0
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 0
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 1
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 1
                                                    }
                                                  ]
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "ge",
                                              "args": [
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 0
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 0
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 2
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 2
                                                    }
                                                  ]
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "sub",
                                          "args": [
                                            {
                                              "fn": "component",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "cellMax",
                                                  "tupleSize": 3
                                                }
                                              ],
                                              "index": 0
                                            },
                                            {
                                              "fn": "component",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "cellMin",
                                                  "tupleSize": 3
                                                }
                                              ],
                                              "index": 0
                                            }
                                          ]
                                        }
                                      ]
                                    },
                                    {
                                      "fn": "add",
                                      "args": [
                                        {
                                          "fn": "mul",
                                          "args": [
                                            {
                                              "fn": "mul",
                                              "args": [
                                                {
                                                  "fn": "mul",
                                                  "args": [
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    1,
                                                    {
                                                      "fn": "mul",
                                                      "args": [
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "mul",
                                          "args": [
                                            {
                                              "fn": "sub",
                                              "args": [
                                                1,
                                                {
                                                  "fn": "add",
                                                  "args": [
                                                    {
                                                      "fn": "mul",
                                                      "args": [
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "mul",
                                                      "args": [
                                                        {
                                                          "fn": "mul",
                                                          "args": [
                                                            {
                                                              "fn": "ge",
                                                              "args": [
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    }
                                                                  ]
                                                                },
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    }
                                                                  ]
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "ge",
                                                              "args": [
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    }
                                                                  ]
                                                                },
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 2
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 2
                                                                    }
                                                                  ]
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            1,
                                                            {
                                                              "fn": "mul",
                                                              "args": [
                                                                {
                                                                  "fn": "ge",
                                                                  "args": [
                                                                    {
                                                                      "fn": "sub",
                                                                      "args": [
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMax",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 0
                                                                        },
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMin",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 0
                                                                        }
                                                                      ]
                                                                    },
                                                                    {
                                                                      "fn": "sub",
                                                                      "args": [
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMax",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 1
                                                                        },
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMin",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 1
                                                                        }
                                                                      ]
                                                                    }
                                                                  ]
                                                                },
                                                                {
                                                                  "fn": "ge",
                                                                  "args": [
                                                                    {
                                                                      "fn": "sub",
                                                                      "args": [
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMax",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 0
                                                                        },
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMin",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 0
                                                                        }
                                                                      ]
                                                                    },
                                                                    {
                                                                      "fn": "sub",
                                                                      "args": [
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMax",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 2
                                                                        },
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMin",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 2
                                                                        }
                                                                      ]
                                                                    }
                                                                  ]
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                }
                                              ]
                                            }
                                          ]
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        },
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "cellMax",
                              "tupleSize": 3
                            }
                          ],
                          "index": 1
                        }
                      ]
                    },
                    {
                      "fn": "select",
                      "args": [
                        {
                          "fn": "mul",
                          "args": [
                            {
                              "fn": "sub",
                              "args": [
                                1,
                                {
                                  "fn": "add",
                                  "args": [
                                    {
                                      "fn": "mul",
                                      "args": [
                                        {
                                          "fn": "ge",
                                          "args": [
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "ge",
                                          "args": [
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                }
                                              ]
                                            }
                                          ]
                                        }
                                      ]
                                    },
                                    {
                                      "fn": "mul",
                                      "args": [
                                        {
                                          "fn": "mul",
                                          "args": [
                                            {
                                              "fn": "ge",
                                              "args": [
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 1
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 1
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 0
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 0
                                                    }
                                                  ]
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "ge",
                                              "args": [
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 1
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 1
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 2
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 2
                                                    }
                                                  ]
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "sub",
                                          "args": [
                                            1,
                                            {
                                              "fn": "mul",
                                              "args": [
                                                {
                                                  "fn": "ge",
                                                  "args": [
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 0
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 0
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 1
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 1
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "ge",
                                                  "args": [
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 0
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 0
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 2
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 2
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            }
                                          ]
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "fn": "sub",
                              "args": [
                                1,
                                {
                                  "fn": "attribute",
                                  "name": "slot"
                                }
                              ]
                            }
                          ]
                        },
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
                                      "fn": "mul",
                                      "args": [
                                        {
                                          "fn": "ge",
                                          "args": [
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "ge",
                                          "args": [
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 0
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                }
                                              ]
                                            }
                                          ]
                                        }
                                      ]
                                    },
                                    {
                                      "fn": "component",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "cellMin",
                                          "tupleSize": 3
                                        }
                                      ],
                                      "index": 0
                                    }
                                  ]
                                },
                                {
                                  "fn": "add",
                                  "args": [
                                    {
                                      "fn": "mul",
                                      "args": [
                                        {
                                          "fn": "mul",
                                          "args": [
                                            {
                                              "fn": "mul",
                                              "args": [
                                                {
                                                  "fn": "ge",
                                                  "args": [
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 1
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 1
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 0
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 0
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "ge",
                                                  "args": [
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 1
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 1
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMax",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 2
                                                        },
                                                        {
                                                          "fn": "component",
                                                          "args": [
                                                            {
                                                              "fn": "attribute",
                                                              "name": "cellMin",
                                                              "tupleSize": 3
                                                            }
                                                          ],
                                                          "index": 2
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                1,
                                                {
                                                  "fn": "mul",
                                                  "args": [
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "component",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "cellMin",
                                              "tupleSize": 3
                                            }
                                          ],
                                          "index": 1
                                        }
                                      ]
                                    },
                                    {
                                      "fn": "mul",
                                      "args": [
                                        {
                                          "fn": "sub",
                                          "args": [
                                            1,
                                            {
                                              "fn": "add",
                                              "args": [
                                                {
                                                  "fn": "mul",
                                                  "args": [
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "mul",
                                                  "args": [
                                                    {
                                                      "fn": "mul",
                                                      "args": [
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "sub",
                                                      "args": [
                                                        1,
                                                        {
                                                          "fn": "mul",
                                                          "args": [
                                                            {
                                                              "fn": "ge",
                                                              "args": [
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    }
                                                                  ]
                                                                },
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    }
                                                                  ]
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "ge",
                                                              "args": [
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    }
                                                                  ]
                                                                },
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 2
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 2
                                                                    }
                                                                  ]
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "component",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "cellMin",
                                              "tupleSize": 3
                                            }
                                          ],
                                          "index": 2
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "fn": "mul",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "cutFrac"
                                },
                                {
                                  "fn": "add",
                                  "args": [
                                    {
                                      "fn": "mul",
                                      "args": [
                                        {
                                          "fn": "mul",
                                          "args": [
                                            {
                                              "fn": "ge",
                                              "args": [
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 0
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 0
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 1
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 1
                                                    }
                                                  ]
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "ge",
                                              "args": [
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 0
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 0
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMax",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 2
                                                    },
                                                    {
                                                      "fn": "component",
                                                      "args": [
                                                        {
                                                          "fn": "attribute",
                                                          "name": "cellMin",
                                                          "tupleSize": 3
                                                        }
                                                      ],
                                                      "index": 2
                                                    }
                                                  ]
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "sub",
                                          "args": [
                                            {
                                              "fn": "component",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "cellMax",
                                                  "tupleSize": 3
                                                }
                                              ],
                                              "index": 0
                                            },
                                            {
                                              "fn": "component",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "cellMin",
                                                  "tupleSize": 3
                                                }
                                              ],
                                              "index": 0
                                            }
                                          ]
                                        }
                                      ]
                                    },
                                    {
                                      "fn": "add",
                                      "args": [
                                        {
                                          "fn": "mul",
                                          "args": [
                                            {
                                              "fn": "mul",
                                              "args": [
                                                {
                                                  "fn": "mul",
                                                  "args": [
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 0
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "ge",
                                                      "args": [
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 1
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMax",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            },
                                                            {
                                                              "fn": "component",
                                                              "args": [
                                                                {
                                                                  "fn": "attribute",
                                                                  "name": "cellMin",
                                                                  "tupleSize": 3
                                                                }
                                                              ],
                                                              "index": 2
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                },
                                                {
                                                  "fn": "sub",
                                                  "args": [
                                                    1,
                                                    {
                                                      "fn": "mul",
                                                      "args": [
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 1
                                                }
                                              ]
                                            }
                                          ]
                                        },
                                        {
                                          "fn": "mul",
                                          "args": [
                                            {
                                              "fn": "sub",
                                              "args": [
                                                1,
                                                {
                                                  "fn": "add",
                                                  "args": [
                                                    {
                                                      "fn": "mul",
                                                      "args": [
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 1
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "ge",
                                                          "args": [
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 0
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "sub",
                                                              "args": [
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMax",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                },
                                                                {
                                                                  "fn": "component",
                                                                  "args": [
                                                                    {
                                                                      "fn": "attribute",
                                                                      "name": "cellMin",
                                                                      "tupleSize": 3
                                                                    }
                                                                  ],
                                                                  "index": 2
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    },
                                                    {
                                                      "fn": "mul",
                                                      "args": [
                                                        {
                                                          "fn": "mul",
                                                          "args": [
                                                            {
                                                              "fn": "ge",
                                                              "args": [
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    }
                                                                  ]
                                                                },
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 0
                                                                    }
                                                                  ]
                                                                }
                                                              ]
                                                            },
                                                            {
                                                              "fn": "ge",
                                                              "args": [
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 1
                                                                    }
                                                                  ]
                                                                },
                                                                {
                                                                  "fn": "sub",
                                                                  "args": [
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMax",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 2
                                                                    },
                                                                    {
                                                                      "fn": "component",
                                                                      "args": [
                                                                        {
                                                                          "fn": "attribute",
                                                                          "name": "cellMin",
                                                                          "tupleSize": 3
                                                                        }
                                                                      ],
                                                                      "index": 2
                                                                    }
                                                                  ]
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        },
                                                        {
                                                          "fn": "sub",
                                                          "args": [
                                                            1,
                                                            {
                                                              "fn": "mul",
                                                              "args": [
                                                                {
                                                                  "fn": "ge",
                                                                  "args": [
                                                                    {
                                                                      "fn": "sub",
                                                                      "args": [
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMax",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 0
                                                                        },
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMin",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 0
                                                                        }
                                                                      ]
                                                                    },
                                                                    {
                                                                      "fn": "sub",
                                                                      "args": [
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMax",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 1
                                                                        },
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMin",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 1
                                                                        }
                                                                      ]
                                                                    }
                                                                  ]
                                                                },
                                                                {
                                                                  "fn": "ge",
                                                                  "args": [
                                                                    {
                                                                      "fn": "sub",
                                                                      "args": [
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMax",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 0
                                                                        },
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMin",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 0
                                                                        }
                                                                      ]
                                                                    },
                                                                    {
                                                                      "fn": "sub",
                                                                      "args": [
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMax",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 2
                                                                        },
                                                                        {
                                                                          "fn": "component",
                                                                          "args": [
                                                                            {
                                                                              "fn": "attribute",
                                                                              "name": "cellMin",
                                                                              "tupleSize": 3
                                                                            }
                                                                          ],
                                                                          "index": 2
                                                                        }
                                                                      ]
                                                                    }
                                                                  ]
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            },
                                            {
                                              "fn": "sub",
                                              "args": [
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMax",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                },
                                                {
                                                  "fn": "component",
                                                  "args": [
                                                    {
                                                      "fn": "attribute",
                                                      "name": "cellMin",
                                                      "tupleSize": 3
                                                    }
                                                  ],
                                                  "index": 2
                                                }
                                              ]
                                            }
                                          ]
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        },
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "cellMax",
                              "tupleSize": 3
                            }
                          ],
                          "index": 2
                        }
                      ]
                    }
                  ]
                }
              }
            },
            {
              "id": "stillOpen",
              "type": "setAttribute",
              "params": {
                "name": "live",
                "domain": "point",
                "type": "u32",
                "tupleSize": 1,
                "value": {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "lt",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "depth"
                        },
                        9
                      ]
                    },
                    {
                      "fn": "gt",
                      "args": [
                        {
                          "fn": "max",
                          "args": [
                            {
                              "fn": "max",
                              "args": [
                                {
                                  "fn": "sub",
                                  "args": [
                                    {
                                      "fn": "component",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "boundsMax",
                                          "tupleSize": 3
                                        }
                                      ],
                                      "index": 0
                                    },
                                    {
                                      "fn": "component",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "boundsMin",
                                          "tupleSize": 3
                                        }
                                      ],
                                      "index": 0
                                    }
                                  ]
                                },
                                {
                                  "fn": "sub",
                                  "args": [
                                    {
                                      "fn": "component",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "boundsMax",
                                          "tupleSize": 3
                                        }
                                      ],
                                      "index": 1
                                    },
                                    {
                                      "fn": "component",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "boundsMin",
                                          "tupleSize": 3
                                        }
                                      ],
                                      "index": 1
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "fn": "sub",
                              "args": [
                                {
                                  "fn": "component",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "boundsMax",
                                      "tupleSize": 3
                                    }
                                  ],
                                  "index": 2
                                },
                                {
                                  "fn": "component",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "boundsMin",
                                      "tupleSize": 3
                                    }
                                  ],
                                  "index": 2
                                }
                              ]
                            }
                          ]
                        },
                        1.7
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
              "id": "leaves",
              "type": "filterByAttribute",
              "params": {
                "attribute": "live",
                "comparison": "eq",
                "value": 0,
                "topology": "drop"
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
                "name": "live",
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
                "open",
                "in"
              ]
            },
            {
              "from": [
                "open",
                "out"
              ],
              "to": [
                "keepLo",
                "in"
              ]
            },
            {
              "from": [
                "keepLo",
                "out"
              ],
              "to": [
                "keepHi",
                "in"
              ]
            },
            {
              "from": [
                "keepHi",
                "out"
              ],
              "to": [
                "where",
                "in"
              ]
            },
            {
              "from": [
                "where",
                "out"
              ],
              "to": [
                "halves",
                "target"
              ]
            },
            {
              "from": [
                "halves",
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
                "deeper",
                "in"
              ]
            },
            {
              "from": [
                "deeper",
                "out"
              ],
              "to": [
                "cut",
                "in"
              ]
            },
            {
              "from": [
                "cut",
                "out"
              ],
              "to": [
                "stillOpen",
                "in"
              ]
            },
            {
              "from": [
                "pass",
                "out"
              ],
              "to": [
                "leaves",
                "in"
              ]
            },
            {
              "from": [
                "leaves",
                "out"
              ],
              "to": [
                "join",
                "in"
              ]
            },
            {
              "from": [
                "stillOpen",
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
            "node": "halves",
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
      "id": "centre",
      "type": "setAttribute",
      "params": {
        "name": "P",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "mul",
          "args": [
            0.5,
            {
              "fn": "add",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMin",
                  "tupleSize": 3
                },
                {
                  "fn": "attribute",
                  "name": "boundsMax",
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
      "id": "panelSize",
      "type": "setAttribute",
      "params": {
        "name": "scale",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "mul",
          "args": [
            0.86,
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "attribute",
                  "name": "boundsMax",
                  "tupleSize": 3
                },
                {
                  "fn": "attribute",
                  "name": "boundsMin",
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
      "id": "unitBox",
      "type": "meshPrimitive",
      "params": {
        "shape": "box",
        "size": [
          1,
          1,
          1
        ],
        "center": [
          0,
          0,
          0
        ],
        "orientation": "xz",
        "subdivisions": [
          1,
          1,
          1
        ],
        "flip": false
      }
    },
    {
      "id": "panels",
      "type": "copyToPoints",
      "params": {
        "targetNames": [],
        "targetIndexAttr": "",
        "sourceGroupAttr": "",
        "targetGroupAttr": "",
        "topology": "keep"
      }
    }
  ],
  "connections": [
    {
      "from": [
        "rootPt",
        "out"
      ],
      "to": [
        "rootCell",
        "in"
      ]
    },
    {
      "from": [
        "rootCell",
        "out"
      ],
      "to": [
        "rootDepth",
        "in"
      ]
    },
    {
      "from": [
        "rootDepth",
        "out"
      ],
      "to": [
        "rootLive",
        "in"
      ]
    },
    {
      "from": [
        "rootLive",
        "out"
      ],
      "to": [
        "split",
        "carry"
      ]
    },
    {
      "from": [
        "rules",
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
        "split",
        "rules"
      ]
    },
    {
      "from": [
        "split",
        "carry"
      ],
      "to": [
        "centre",
        "in"
      ]
    },
    {
      "from": [
        "centre",
        "out"
      ],
      "to": [
        "panelSize",
        "in"
      ]
    },
    {
      "from": [
        "unitBox",
        "out"
      ],
      "to": [
        "panels",
        "source"
      ]
    },
    {
      "from": [
        "panelSize",
        "out"
      ],
      "to": [
        "panels",
        "target"
      ]
    }
  ],
  "outputs": [
    {
      "id": "panels",
      "pin": "out",
      "name": "panels"
    }
  ]
}
`;export{e as default};