var e=`{
  "formatVersion": 1,
  "seed": 1889,
  "meta": {
    "title": "A brick house split on a stud lattice and built in bricks",
    "description": "A SHORT TERRACE OF HOUSES DERIVED BY A SPLIT GRAMMAR ON AN INTEGER LATTICE, THEN BUILT IN BRICKS. Every terminal of the grammar is an axis-aligned box whose corners are WHOLE NUMBERS -- x and z in studs, y in plates, a plate 0.4 of a stud -- carrying a string \`kind\` (wall, glass, door, roof, floor, ground) and a palette colour; \`packBricks\` turns those boxes into catalogue bricks, and the house is drawn as two instance batches, bricks and the studs left showing. THE GRAMMAR IS STAGED, NOT RECURSIVE. The derivation is lot -> blocks -> storeys -> a floor slab and four walls -> bays -> sill, head, two jambs and the opening, with a ceiling slab over each block's top storey and a second branch from each block to the layers of a stepped gable roof standing on it. Every one of those rules has the SAME shape: fan the cell out to M slots against a rule cloud of M coincident points (\`copyToPoints\`, the slot riding on the source so it survives later filters), keep the slots a predicate allows, and rewrite the box piecewise by slot as sums of \`eq(slot, i) * value_i\`. The stage decides what a cell is, so no rule dispatches on a string; the one string dispatch is the palette, a \`byAttribute\` on \`kind\` that is the single table of colours. Depth is bounded -- two rounds of block splitting, at most three storeys, eight bays, fourteen roof layers -- so the rounds are written out rather than looped. That is the difference from \`examples-facade\` and \`examples-floorplan\`, which recurse under \`repeatUntil\`: what the three share is the fan-out-keep-rewrite rule, not the form of the derivation. THE CUT IS SNAPPED, AND DECIDED ON THE PARENT: \`floor(span * f + 0.5)\` clamped so neither half falls under six studs, carried to both children in \`targetNames\` exactly as the facade does, so the two halves of a block meet at one integer coordinate. THE WORKING BOX IS \`lo\`/\`hi\`, NOT \`boundsMin\`/\`boundsMax\`. The rule cloud, like every source, already carries the standard bounds columns, and \`copyToPoints\` will not carry a target column the source also has, since the two would write one column; so the box rides in two attributes of its own and bounds are written once, at the end, in world units. One trap came with it: the two corners are rewritten by TWO nodes, so the second reads the first's output. The walls and openings are ordered so the second never reads a component the first changed; the roof rewrites both corners from every component, so it carries the block's original box (\`blo\`/\`bhi\`) and reads only that. A WINDOW GOES ONLY WHERE A WALL IS EXPOSED, and exposure is computed rather than assumed. Blocks share party walls, and a tall block beside a low one has a wall that is covered at the bottom and open above. Each candidate opening places a probe half a stud outside its wall at the BOTTOM of where the opening would be, and \`pathCoverage\` with \`near\` = \`far\` = 0 asks whether it lies inside any block or roof layer, the boxes read as points with their size from their corners. Bottom is enough because roof layers stack on blocks that stand on the ground, with nothing overhanging: if the bottom of the opening is free, everything above it in that column is free too. ACROSS the opening it takes one point PER STUD, because a neighbour ending mid-window or a roof layer stepping in can cover part of the width, and a box on the lattice that overlaps the opening at all contains one of its studs; openings are at most two studs wide, so two rays spread along the wall. The window-or-solid roll is drawn BEFORE the probe moves the point: a random draw hashes the point's identity, its position as well as its seed, so a roll drawn after the probe would change whenever the probe did. Doors go on the ground floor of the first lot-edge wall, south then north, in the middle bay; a z split happens at most once, so every block has one. THE BUILD. \`packBricks\` reads the pieces' world corners, keeps \`kind\` and colour apart with \`groupBy\`, and lays every wall in full bricks with the joints staggered course to course; the catalogue is the default one plus a 32 x 32 BASEPLATE, which the ground is exactly -- one piece under the whole lot, not a margin of loose plates. Neighbouring blocks each build their own wall, so a party wall is two studs thick, and the stud at each gable end of a roof layer has kind \`wall\` (it is the gable, in the wall's colour). THE MESHES ARE THE GRAPH'S OWN: two outputs carry \`role: \\"asset\\"\`, so \`brick\` (a unit box centred on its point) and \`stud\` (a twelve-sided stud, its outline the \`shape/path-loop\` primitive) are the meshes the two spawners' asset ids resolve to, in the editor and in \`pcg render\`, rather than placeholders. One box serves every brick because a brick point's \`scale\` is its own-frame size and its \`rot\` the quarter turn of a brick laid sideways. A hairline gap is taken off every brick's \`scale\` so the joints read; a brick is centred on its point, so that lowers its drawn top by half the gap, and the stud mesh stands the same half-gap below its point so a stud sits on the brick as drawn. WHAT HOLDS TOGETHER is measured, not assumed. \`brickConnectivity\` numbers the pieces stud clutch alone holds together and gives every brick a build STEP: courses bottom up, a brick placed when it stands on the baseplate or grips one already placed, a plate hung under a floor placed with the floor. A floor or a roof's first course laid over an empty room is the hard case -- its plates touch nothing below, and the ones that reach no wall are held only by what is laid on them. The packer answers most of it: plates up to 2x16 in the catalogue, so a floor's plates reach a wall, and \`bond\`, which rewards a placement for every two pieces it joins, so the course above bridges the loose ones. What the packer cannot answer is a roof over an EMPTY ATTIC: only its two outer strips stand on walls, and a roof that narrows as it rises has no course wide enough to tie the middle strips back to them. That is the grammar's to fix -- a house has a ceiling -- so each block carries a one-plate ceiling slab over its top storey and the roof stands on it. A brick no order can attach keeps step -1; the whole build draws it and every partial build leaves it out rather than show it hanging in air. THE \`buildStep\` PARAM shows the build as it stands after that step: bricks are kept while their step is at most it, and a stud shows once its brick is placed and until the brick resting on it is -- which is why the packer is asked for EVERY stud (\`studMode: all\`) with the index of the brick on it, and the step of each is read across by index.",
    "tags": [
      "examples",
      "structure",
      "topology"
    ]
  },
  "params": [
    {
      "name": "buildStep",
      "value": 60,
      "min": 0,
      "max": 60,
      "description": "Show the build as it stands after this many steps, counting from 0. A step is one course of the build placed bottom up, with anything hanging under a brick placed alongside it; the default and maximum, 60, is past every house's last step and shows the whole build -- including the few bricks no order can attach (step -1), which every smaller value hides rather than draw hanging in air."
    }
  ],
  "nodes": [
    {
      "id": "lotPt",
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
        ],
        "includeEnd": true,
        "spacing": 1
      }
    },
    {
      "id": "lotSize",
      "type": "setAttribute",
      "params": {
        "name": "lot",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "vec",
          "args": [
            {
              "fn": "add",
              "args": [
                14,
                {
                  "fn": "mul",
                  "args": [
                    2,
                    {
                      "fn": "floor",
                      "args": [
                        {
                          "fn": "mul",
                          "args": [
                            {
                              "fn": "randomField",
                              "key": "w"
                            },
                            6.999
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            0,
            {
              "fn": "add",
              "args": [
                10,
                {
                  "fn": "mul",
                  "args": [
                    2,
                    {
                      "fn": "floor",
                      "args": [
                        {
                          "fn": "mul",
                          "args": [
                            {
                              "fn": "randomField",
                              "key": "d"
                            },
                            4.999
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
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "lotLo",
      "type": "setAttribute",
      "params": {
        "name": "lo",
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
      "id": "lotHi",
      "type": "setAttribute",
      "params": {
        "name": "hi",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "vec",
          "args": [
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "lot",
                  "tupleSize": 3
                }
              ],
              "index": 0
            },
            1,
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "lot",
                  "tupleSize": 3
                }
              ],
              "index": 2
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
      "id": "b1Ax",
      "type": "setAttribute",
      "params": {
        "name": "ax",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
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
                      "name": "hi",
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
                      "name": "lo",
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
                      "name": "hi",
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
                      "name": "lo",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
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
      "id": "b1Can",
      "type": "setAttribute",
      "params": {
        "name": "can",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "ge",
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
                          "name": "hi",
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
                          "name": "lo",
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
                          "name": "hi",
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
                          "name": "lo",
                          "tupleSize": 3
                        }
                      ],
                      "index": 2
                    }
                  ]
                }
              ]
            },
            12
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
      "id": "b1Cut",
      "type": "setAttribute",
      "params": {
        "name": "cutAt",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "add",
          "args": [
            {
              "fn": "select",
              "args": [
                {
                  "fn": "attribute",
                  "name": "ax"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "lo",
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
                      "name": "lo",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                }
              ]
            },
            {
              "fn": "clamp",
              "args": [
                {
                  "fn": "floor",
                  "args": [
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "mul",
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
                                          "name": "hi",
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
                                          "name": "lo",
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
                                          "name": "hi",
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
                                          "name": "lo",
                                          "tupleSize": 3
                                        }
                                      ],
                                      "index": 2
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "fn": "add",
                              "args": [
                                0.35,
                                {
                                  "fn": "mul",
                                  "args": [
                                    0.3,
                                    {
                                      "fn": "randomField",
                                      "key": "cut1"
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        },
                        0.5
                      ]
                    }
                  ]
                },
                6,
                {
                  "fn": "sub",
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
                                  "name": "hi",
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
                                  "name": "lo",
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
                                  "name": "hi",
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
                                  "name": "lo",
                                  "tupleSize": 3
                                }
                              ],
                              "index": 2
                            }
                          ]
                        }
                      ]
                    },
                    6
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
      "id": "b1Fan",
      "type": "copyToPoints",
      "params": {
        "targetNames": [
          "lo",
          "hi",
          "lot",
          "ax",
          "can",
          "cutAt"
        ],
        "targetIndexAttr": "",
        "rotateAttrs": [],
        "sourceGroupAttr": "",
        "targetGroupAttr": "",
        "mirrorAware": true,
        "topology": "drop"
      }
    },
    {
      "id": "rules2Pts",
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
        ],
        "includeEnd": true,
        "spacing": 1
      }
    },
    {
      "id": "rules2Seed",
      "type": "setAttribute",
      "params": {
        "name": "seed",
        "domain": "point",
        "type": "u32",
        "tupleSize": 1,
        "value": {
          "fn": "add",
          "args": [
            31,
            {
              "fn": "mul",
              "args": [
                {
                  "fn": "index"
                },
                5119
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
      "id": "rules2",
      "type": "setAttribute",
      "params": {
        "name": "slot",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "index"
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "b1Keep",
      "type": "filterByExpression",
      "params": {
        "predicate": {
          "fn": "max",
          "args": [
            {
              "fn": "sub",
              "args": [
                1,
                {
                  "fn": "attribute",
                  "name": "slot"
                }
              ]
            },
            {
              "fn": "attribute",
              "name": "can"
            }
          ]
        },
        "seed": 0,
        "topology": "drop"
      }
    },
    {
      "id": "b1Lo",
      "type": "setAttribute",
      "params": {
        "name": "lo",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
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
                          "fn": "attribute",
                          "name": "ax"
                        },
                        {
                          "fn": "attribute",
                          "name": "can"
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
                  "fn": "attribute",
                  "name": "cutAt"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "lo",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                }
              ]
            },
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "lo",
                  "tupleSize": 3
                }
              ],
              "index": 1
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
                          "fn": "sub",
                          "args": [
                            1,
                            {
                              "fn": "attribute",
                              "name": "ax"
                            }
                          ]
                        },
                        {
                          "fn": "attribute",
                          "name": "can"
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
                  "fn": "attribute",
                  "name": "cutAt"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "lo",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
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
      "id": "b1Hi",
      "type": "setAttribute",
      "params": {
        "name": "hi",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
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
                          "fn": "attribute",
                          "name": "ax"
                        },
                        {
                          "fn": "attribute",
                          "name": "can"
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
                  "fn": "attribute",
                  "name": "cutAt"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "hi",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                }
              ]
            },
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "hi",
                  "tupleSize": 3
                }
              ],
              "index": 1
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
                          "fn": "sub",
                          "args": [
                            1,
                            {
                              "fn": "attribute",
                              "name": "ax"
                            }
                          ]
                        },
                        {
                          "fn": "attribute",
                          "name": "can"
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
                  "fn": "attribute",
                  "name": "cutAt"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "hi",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
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
      "id": "b2Ax",
      "type": "setAttribute",
      "params": {
        "name": "ax",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
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
                      "name": "hi",
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
                      "name": "lo",
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
                      "name": "hi",
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
                      "name": "lo",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
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
      "id": "b2Can",
      "type": "setAttribute",
      "params": {
        "name": "can",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "ge",
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
                          "name": "hi",
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
                          "name": "lo",
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
                          "name": "hi",
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
                          "name": "lo",
                          "tupleSize": 3
                        }
                      ],
                      "index": 2
                    }
                  ]
                }
              ]
            },
            12
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
      "id": "b2Cut",
      "type": "setAttribute",
      "params": {
        "name": "cutAt",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "add",
          "args": [
            {
              "fn": "select",
              "args": [
                {
                  "fn": "attribute",
                  "name": "ax"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "lo",
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
                      "name": "lo",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                }
              ]
            },
            {
              "fn": "clamp",
              "args": [
                {
                  "fn": "floor",
                  "args": [
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "mul",
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
                                          "name": "hi",
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
                                          "name": "lo",
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
                                          "name": "hi",
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
                                          "name": "lo",
                                          "tupleSize": 3
                                        }
                                      ],
                                      "index": 2
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "fn": "add",
                              "args": [
                                0.35,
                                {
                                  "fn": "mul",
                                  "args": [
                                    0.3,
                                    {
                                      "fn": "randomField",
                                      "key": "cut2"
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        },
                        0.5
                      ]
                    }
                  ]
                },
                6,
                {
                  "fn": "sub",
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
                                  "name": "hi",
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
                                  "name": "lo",
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
                                  "name": "hi",
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
                                  "name": "lo",
                                  "tupleSize": 3
                                }
                              ],
                              "index": 2
                            }
                          ]
                        }
                      ]
                    },
                    6
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
      "id": "b2Fan",
      "type": "copyToPoints",
      "params": {
        "targetNames": [
          "lo",
          "hi",
          "lot",
          "ax",
          "can",
          "cutAt"
        ],
        "targetIndexAttr": "",
        "rotateAttrs": [],
        "sourceGroupAttr": "",
        "targetGroupAttr": "",
        "mirrorAware": true,
        "topology": "drop"
      }
    },
    {
      "id": "b2Keep",
      "type": "filterByExpression",
      "params": {
        "predicate": {
          "fn": "max",
          "args": [
            {
              "fn": "sub",
              "args": [
                1,
                {
                  "fn": "attribute",
                  "name": "slot"
                }
              ]
            },
            {
              "fn": "attribute",
              "name": "can"
            }
          ]
        },
        "seed": 0,
        "topology": "drop"
      }
    },
    {
      "id": "b2Lo",
      "type": "setAttribute",
      "params": {
        "name": "lo",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
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
                          "fn": "attribute",
                          "name": "ax"
                        },
                        {
                          "fn": "attribute",
                          "name": "can"
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
                  "fn": "attribute",
                  "name": "cutAt"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "lo",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                }
              ]
            },
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "lo",
                  "tupleSize": 3
                }
              ],
              "index": 1
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
                          "fn": "sub",
                          "args": [
                            1,
                            {
                              "fn": "attribute",
                              "name": "ax"
                            }
                          ]
                        },
                        {
                          "fn": "attribute",
                          "name": "can"
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
                  "fn": "attribute",
                  "name": "cutAt"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "lo",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
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
      "id": "b2Hi",
      "type": "setAttribute",
      "params": {
        "name": "hi",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
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
                          "fn": "attribute",
                          "name": "ax"
                        },
                        {
                          "fn": "attribute",
                          "name": "can"
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
                  "fn": "attribute",
                  "name": "cutAt"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "hi",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                }
              ]
            },
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "hi",
                  "tupleSize": 3
                }
              ],
              "index": 1
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
                          "fn": "sub",
                          "args": [
                            1,
                            {
                              "fn": "attribute",
                              "name": "ax"
                            }
                          ]
                        },
                        {
                          "fn": "attribute",
                          "name": "can"
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
                  "fn": "attribute",
                  "name": "cutAt"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "hi",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
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
      "id": "blkStoreys",
      "type": "setAttribute",
      "params": {
        "name": "storeys",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "add",
          "args": [
            1,
            {
              "fn": "floor",
              "args": [
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "randomField",
                      "key": "storeys"
                    },
                    2.999
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
      "id": "blkWall",
      "type": "setAttribute",
      "params": {
        "name": "wallTint",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "floor",
          "args": [
            {
              "fn": "mul",
              "args": [
                {
                  "fn": "randomField",
                  "key": "wallTint"
                },
                4.999
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
      "id": "blkRoof",
      "type": "setAttribute",
      "params": {
        "name": "roofTint",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "floor",
          "args": [
            {
              "fn": "mul",
              "args": [
                {
                  "fn": "randomField",
                  "key": "roofTint"
                },
                2.999
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
      "id": "blkHi",
      "type": "setAttribute",
      "params": {
        "name": "hi",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "vec",
          "args": [
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "hi",
                  "tupleSize": 3
                }
              ],
              "index": 0
            },
            {
              "fn": "add",
              "args": [
                2,
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "storeys"
                    },
                    16
                  ]
                }
              ]
            },
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "hi",
                  "tupleSize": 3
                }
              ],
              "index": 2
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
      "id": "blkExt",
      "type": "setAttribute",
      "params": {
        "name": "ext",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "vec",
          "args": [
            {
              "fn": "eq",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "lo",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                },
                0
              ]
            },
            {
              "fn": "eq",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "hi",
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
                      "name": "lot",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                }
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
      "id": "stFan",
      "type": "copyToPoints",
      "params": {
        "targetNames": [
          "lo",
          "hi",
          "lot",
          "wallTint",
          "roofTint",
          "storeys",
          "ext"
        ],
        "targetIndexAttr": "",
        "rotateAttrs": [],
        "sourceGroupAttr": "",
        "targetGroupAttr": "",
        "mirrorAware": true,
        "topology": "drop"
      }
    },
    {
      "id": "rules3Pts",
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
        ],
        "includeEnd": true,
        "spacing": 1
      }
    },
    {
      "id": "rules3Seed",
      "type": "setAttribute",
      "params": {
        "name": "seed",
        "domain": "point",
        "type": "u32",
        "tupleSize": 1,
        "value": {
          "fn": "add",
          "args": [
            38,
            {
              "fn": "mul",
              "args": [
                {
                  "fn": "index"
                },
                5119
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
      "id": "rules3",
      "type": "setAttribute",
      "params": {
        "name": "slot",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "index"
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "stKeep",
      "type": "filterByExpression",
      "params": {
        "predicate": {
          "fn": "lt",
          "args": [
            {
              "fn": "attribute",
              "name": "slot"
            },
            {
              "fn": "attribute",
              "name": "storeys"
            }
          ]
        },
        "seed": 0,
        "topology": "drop"
      }
    },
    {
      "id": "stLevel",
      "type": "setAttribute",
      "params": {
        "name": "level",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "attribute",
          "name": "slot"
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "stLo",
      "type": "setAttribute",
      "params": {
        "name": "lo",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "vec",
          "args": [
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "lo",
                  "tupleSize": 3
                }
              ],
              "index": 0
            },
            {
              "fn": "add",
              "args": [
                1,
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "slot"
                    },
                    16
                  ]
                }
              ]
            },
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "lo",
                  "tupleSize": 3
                }
              ],
              "index": 2
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
      "id": "stHi",
      "type": "setAttribute",
      "params": {
        "name": "hi",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "vec",
          "args": [
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "hi",
                  "tupleSize": 3
                }
              ],
              "index": 0
            },
            {
              "fn": "add",
              "args": [
                1,
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "slot"
                        },
                        1
                      ]
                    },
                    16
                  ]
                }
              ]
            },
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "hi",
                  "tupleSize": 3
                }
              ],
              "index": 2
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
      "id": "ptFan",
      "type": "copyToPoints",
      "params": {
        "targetNames": [
          "lo",
          "hi",
          "lot",
          "wallTint",
          "roofTint",
          "level",
          "ext"
        ],
        "targetIndexAttr": "",
        "rotateAttrs": [],
        "sourceGroupAttr": "",
        "targetGroupAttr": "",
        "mirrorAware": true,
        "topology": "drop"
      }
    },
    {
      "id": "rules5Pts",
      "type": "pointLine",
      "params": {
        "mode": "endpoints",
        "count": 5,
        "start": [
          0,
          0,
          0
        ],
        "end": [
          0,
          0,
          0
        ],
        "includeEnd": true,
        "spacing": 1
      }
    },
    {
      "id": "rules5Seed",
      "type": "setAttribute",
      "params": {
        "name": "seed",
        "domain": "point",
        "type": "u32",
        "tupleSize": 1,
        "value": {
          "fn": "add",
          "args": [
            45,
            {
              "fn": "mul",
              "args": [
                {
                  "fn": "index"
                },
                5119
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
      "id": "rules5",
      "type": "setAttribute",
      "params": {
        "name": "slot",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "index"
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "ptLo",
      "type": "setAttribute",
      "params": {
        "name": "lo",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "vec",
          "args": [
            {
              "fn": "add",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "lo",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                },
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "eq",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "slot"
                        },
                        4
                      ]
                    },
                    {
                      "fn": "sub",
                      "args": [
                        {
                          "fn": "sub",
                          "args": [
                            {
                              "fn": "component",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "hi",
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
                                  "name": "lo",
                                  "tupleSize": 3
                                }
                              ],
                              "index": 0
                            }
                          ]
                        },
                        1
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "fn": "add",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "lo",
                      "tupleSize": 3
                    }
                  ],
                  "index": 1
                },
                {
                  "fn": "ge",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "slot"
                    },
                    1
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
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "lo",
                          "tupleSize": 3
                        }
                      ],
                      "index": 2
                    },
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "eq",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "slot"
                            },
                            2
                          ]
                        },
                        {
                          "fn": "sub",
                          "args": [
                            {
                              "fn": "sub",
                              "args": [
                                {
                                  "fn": "component",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "hi",
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
                                      "name": "lo",
                                      "tupleSize": 3
                                    }
                                  ],
                                  "index": 2
                                }
                              ]
                            },
                            1
                          ]
                        }
                      ]
                    }
                  ]
                },
                {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "eq",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "slot"
                        },
                        3
                      ]
                    },
                    {
                      "fn": "eq",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "slot"
                        },
                        4
                      ]
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
      "id": "ptHi",
      "type": "setAttribute",
      "params": {
        "name": "hi",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "vec",
          "args": [
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "hi",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                },
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "eq",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "slot"
                        },
                        3
                      ]
                    },
                    {
                      "fn": "sub",
                      "args": [
                        {
                          "fn": "sub",
                          "args": [
                            {
                              "fn": "component",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "hi",
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
                                  "name": "lo",
                                  "tupleSize": 3
                                }
                              ],
                              "index": 0
                            }
                          ]
                        },
                        1
                      ]
                    }
                  ]
                }
              ]
            },
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
                  "fn": "add",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "lo",
                          "tupleSize": 3
                        }
                      ],
                      "index": 1
                    },
                    1
                  ]
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "hi",
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
                  "fn": "sub",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "hi",
                          "tupleSize": 3
                        }
                      ],
                      "index": 2
                    },
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "eq",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "slot"
                            },
                            1
                          ]
                        },
                        {
                          "fn": "sub",
                          "args": [
                            {
                              "fn": "sub",
                              "args": [
                                {
                                  "fn": "component",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "hi",
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
                                      "name": "lo",
                                      "tupleSize": 3
                                    }
                                  ],
                                  "index": 2
                                }
                              ]
                            },
                            1
                          ]
                        }
                      ]
                    }
                  ]
                },
                {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "eq",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "slot"
                        },
                        3
                      ]
                    },
                    {
                      "fn": "eq",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "slot"
                        },
                        4
                      ]
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
      "id": "ptWall",
      "type": "setAttribute",
      "params": {
        "name": "wall",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "attribute",
          "name": "slot"
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "ptDoorWall",
      "type": "setAttribute",
      "params": {
        "name": "doorWall",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "select",
          "args": [
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "ext",
                  "tupleSize": 3
                }
              ],
              "index": 0
            },
            1,
            {
              "fn": "select",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "ext",
                      "tupleSize": 3
                    }
                  ],
                  "index": 1
                },
                2,
                0
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
      "id": "slabKind",
      "type": "setAttribute",
      "params": {
        "name": "kind",
        "domain": "point",
        "type": "string",
        "tupleSize": 1,
        "value": 0,
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "floor",
        "seed": 0
      }
    },
    {
      "id": "slabs",
      "type": "filterByExpression",
      "params": {
        "predicate": {
          "fn": "eq",
          "args": [
            {
              "fn": "attribute",
              "name": "wall"
            },
            0
          ]
        },
        "seed": 0,
        "topology": "drop"
      }
    },
    {
      "id": "walls",
      "type": "filterByExpression",
      "params": {
        "predicate": {
          "fn": "ge",
          "args": [
            {
              "fn": "attribute",
              "name": "wall"
            },
            1
          ]
        },
        "seed": 0,
        "topology": "drop"
      }
    },
    {
      "id": "ceilLo",
      "type": "setAttribute",
      "params": {
        "name": "lo",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "vec",
          "args": [
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "lo",
                  "tupleSize": 3
                }
              ],
              "index": 0
            },
            {
              "fn": "add",
              "args": [
                1,
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "storeys"
                    },
                    16
                  ]
                }
              ]
            },
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "lo",
                  "tupleSize": 3
                }
              ],
              "index": 2
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
      "id": "ceilKind",
      "type": "setAttribute",
      "params": {
        "name": "kind",
        "domain": "point",
        "type": "string",
        "tupleSize": 1,
        "value": 0,
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "floor",
        "seed": 0
      }
    },
    {
      "id": "wAlong",
      "type": "setAttribute",
      "params": {
        "name": "alongX",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "le",
          "args": [
            {
              "fn": "attribute",
              "name": "wall"
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
      "id": "wLen",
      "type": "setAttribute",
      "params": {
        "name": "len",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "select",
          "args": [
            {
              "fn": "attribute",
              "name": "alongX"
            },
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "hi",
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
                      "name": "lo",
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
                      "name": "hi",
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
                      "name": "lo",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
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
      "id": "wBays",
      "type": "setAttribute",
      "params": {
        "name": "nb",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "max",
          "args": [
            1,
            {
              "fn": "floor",
              "args": [
                {
                  "fn": "div",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "len"
                    },
                    4
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
      "id": "wStart",
      "type": "setAttribute",
      "params": {
        "name": "u0",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "select",
          "args": [
            {
              "fn": "attribute",
              "name": "alongX"
            },
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "lo",
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
                  "name": "lo",
                  "tupleSize": 3
                }
              ],
              "index": 2
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
      "id": "bayFan",
      "type": "copyToPoints",
      "params": {
        "targetNames": [
          "lo",
          "hi",
          "lot",
          "wallTint",
          "roofTint",
          "level",
          "wall",
          "doorWall",
          "alongX",
          "len",
          "nb",
          "u0"
        ],
        "targetIndexAttr": "",
        "rotateAttrs": [],
        "sourceGroupAttr": "",
        "targetGroupAttr": "",
        "mirrorAware": true,
        "topology": "drop"
      }
    },
    {
      "id": "rules8Pts",
      "type": "pointLine",
      "params": {
        "mode": "endpoints",
        "count": 8,
        "start": [
          0,
          0,
          0
        ],
        "end": [
          0,
          0,
          0
        ],
        "includeEnd": true,
        "spacing": 1
      }
    },
    {
      "id": "rules8Seed",
      "type": "setAttribute",
      "params": {
        "name": "seed",
        "domain": "point",
        "type": "u32",
        "tupleSize": 1,
        "value": {
          "fn": "add",
          "args": [
            52,
            {
              "fn": "mul",
              "args": [
                {
                  "fn": "index"
                },
                5119
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
      "id": "rules8",
      "type": "setAttribute",
      "params": {
        "name": "slot",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "index"
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "bayKeep",
      "type": "filterByExpression",
      "params": {
        "predicate": {
          "fn": "lt",
          "args": [
            {
              "fn": "attribute",
              "name": "slot"
            },
            {
              "fn": "attribute",
              "name": "nb"
            }
          ]
        },
        "seed": 0,
        "topology": "drop"
      }
    },
    {
      "id": "bayA",
      "type": "setAttribute",
      "params": {
        "name": "ua",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "add",
          "args": [
            {
              "fn": "attribute",
              "name": "u0"
            },
            {
              "fn": "floor",
              "args": [
                {
                  "fn": "div",
                  "args": [
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "slot"
                        },
                        {
                          "fn": "attribute",
                          "name": "len"
                        }
                      ]
                    },
                    {
                      "fn": "attribute",
                      "name": "nb"
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
      "id": "bayB",
      "type": "setAttribute",
      "params": {
        "name": "ub",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "add",
          "args": [
            {
              "fn": "attribute",
              "name": "u0"
            },
            {
              "fn": "floor",
              "args": [
                {
                  "fn": "div",
                  "args": [
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "add",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "slot"
                            },
                            1
                          ]
                        },
                        {
                          "fn": "attribute",
                          "name": "len"
                        }
                      ]
                    },
                    {
                      "fn": "attribute",
                      "name": "nb"
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
      "id": "bayHi",
      "type": "setAttribute",
      "params": {
        "name": "hi",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "vec",
          "args": [
            {
              "fn": "select",
              "args": [
                {
                  "fn": "attribute",
                  "name": "alongX"
                },
                {
                  "fn": "attribute",
                  "name": "ub"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "hi",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                }
              ]
            },
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "hi",
                  "tupleSize": 3
                }
              ],
              "index": 1
            },
            {
              "fn": "select",
              "args": [
                {
                  "fn": "attribute",
                  "name": "alongX"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "hi",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                },
                {
                  "fn": "attribute",
                  "name": "ub"
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
      "id": "bayLo",
      "type": "setAttribute",
      "params": {
        "name": "lo",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "vec",
          "args": [
            {
              "fn": "select",
              "args": [
                {
                  "fn": "attribute",
                  "name": "alongX"
                },
                {
                  "fn": "attribute",
                  "name": "ua"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "lo",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                }
              ]
            },
            {
              "fn": "component",
              "args": [
                {
                  "fn": "attribute",
                  "name": "lo",
                  "tupleSize": 3
                }
              ],
              "index": 1
            },
            {
              "fn": "select",
              "args": [
                {
                  "fn": "attribute",
                  "name": "alongX"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "lo",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                },
                {
                  "fn": "attribute",
                  "name": "ua"
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
      "id": "bayDoor",
      "type": "setAttribute",
      "params": {
        "name": "door",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "mul",
          "args": [
            {
              "fn": "mul",
              "args": [
                {
                  "fn": "eq",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "level"
                    },
                    0
                  ]
                },
                {
                  "fn": "eq",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "wall"
                    },
                    {
                      "fn": "attribute",
                      "name": "doorWall"
                    }
                  ]
                }
              ]
            },
            {
              "fn": "eq",
              "args": [
                {
                  "fn": "attribute",
                  "name": "slot"
                },
                {
                  "fn": "floor",
                  "args": [
                    {
                      "fn": "div",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "nb"
                        },
                        2
                      ]
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
      "id": "opW",
      "type": "setAttribute",
      "params": {
        "name": "ow",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "min",
          "args": [
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "sub",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "ub"
                    },
                    {
                      "fn": "attribute",
                      "name": "ua"
                    }
                  ]
                },
                2
              ]
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
      "id": "opA",
      "type": "setAttribute",
      "params": {
        "name": "oa",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "add",
          "args": [
            {
              "fn": "attribute",
              "name": "ua"
            },
            {
              "fn": "floor",
              "args": [
                {
                  "fn": "div",
                  "args": [
                    {
                      "fn": "sub",
                      "args": [
                        {
                          "fn": "sub",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "ub"
                            },
                            {
                              "fn": "attribute",
                              "name": "ua"
                            }
                          ]
                        },
                        {
                          "fn": "attribute",
                          "name": "ow"
                        }
                      ]
                    },
                    2
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
      "id": "opB",
      "type": "setAttribute",
      "params": {
        "name": "ob",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "add",
          "args": [
            {
              "fn": "attribute",
              "name": "oa"
            },
            {
              "fn": "attribute",
              "name": "ow"
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
      "id": "winRoll",
      "type": "setAttribute",
      "params": {
        "name": "winRoll",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "randomField",
          "key": "win"
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "probe",
      "type": "setAttribute",
      "params": {
        "name": "P",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "vec",
          "args": [
            {
              "fn": "select",
              "args": [
                {
                  "fn": "attribute",
                  "name": "alongX"
                },
                {
                  "fn": "div",
                  "args": [
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "oa"
                        },
                        {
                          "fn": "attribute",
                          "name": "ob"
                        }
                      ]
                    },
                    2
                  ]
                },
                {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "eq",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "wall"
                            },
                            3
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
                                  "name": "lo",
                                  "tupleSize": 3
                                }
                              ],
                              "index": 0
                            },
                            0.5
                          ]
                        }
                      ]
                    },
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "eq",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "wall"
                            },
                            4
                          ]
                        },
                        {
                          "fn": "add",
                          "args": [
                            {
                              "fn": "component",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "hi",
                                  "tupleSize": 3
                                }
                              ],
                              "index": 0
                            },
                            0.5
                          ]
                        }
                      ]
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
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "lo",
                          "tupleSize": 3
                        }
                      ],
                      "index": 1
                    },
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "sub",
                          "args": [
                            1,
                            {
                              "fn": "attribute",
                              "name": "door"
                            }
                          ]
                        },
                        6
                      ]
                    }
                  ]
                },
                0.5
              ]
            },
            {
              "fn": "select",
              "args": [
                {
                  "fn": "attribute",
                  "name": "alongX"
                },
                {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "eq",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "wall"
                            },
                            1
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
                                  "name": "lo",
                                  "tupleSize": 3
                                }
                              ],
                              "index": 2
                            },
                            0.5
                          ]
                        }
                      ]
                    },
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "eq",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "wall"
                            },
                            2
                          ]
                        },
                        {
                          "fn": "add",
                          "args": [
                            {
                              "fn": "component",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "hi",
                                  "tupleSize": 3
                                }
                              ],
                              "index": 2
                            },
                            0.5
                          ]
                        }
                      ]
                    }
                  ]
                },
                {
                  "fn": "div",
                  "args": [
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "oa"
                        },
                        {
                          "fn": "attribute",
                          "name": "ob"
                        }
                      ]
                    },
                    2
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
      "id": "probeAlong",
      "type": "setAttribute",
      "params": {
        "name": "along",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "vec",
          "args": [
            {
              "fn": "attribute",
              "name": "alongX"
            },
            0,
            {
              "fn": "sub",
              "args": [
                1,
                {
                  "fn": "attribute",
                  "name": "alongX"
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
      "id": "covered",
      "type": "pathCoverage",
      "params": {
        "direction": [
          0,
          1,
          0
        ],
        "near": 0,
        "far": 0,
        "rayCount": 2,
        "spread": {
          "fn": "max",
          "args": [
            0,
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "div",
                  "args": [
                    {
                      "fn": "sub",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "ob"
                        },
                        {
                          "fn": "attribute",
                          "name": "oa"
                        }
                      ]
                    },
                    2
                  ]
                },
                0.25
              ]
            }
          ]
        },
        "minHits": 1,
        "acrossAttr": "along",
        "boxSize": {
          "fn": "sub",
          "args": [
            {
              "fn": "attribute",
              "name": "hi",
              "tupleSize": 3
            },
            {
              "fn": "attribute",
              "name": "lo",
              "tupleSize": 3
            }
          ]
        },
        "coveredAttr": "covered",
        "hitsAttr": ""
      }
    },
    {
      "id": "bayKind",
      "type": "setAttribute",
      "params": {
        "name": "bk",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
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
                          "fn": "attribute",
                          "name": "ub"
                        },
                        {
                          "fn": "attribute",
                          "name": "ua"
                        }
                      ]
                    },
                    3
                  ]
                },
                {
                  "fn": "sub",
                  "args": [
                    1,
                    {
                      "fn": "attribute",
                      "name": "covered"
                    }
                  ]
                }
              ]
            },
            {
              "fn": "select",
              "args": [
                {
                  "fn": "attribute",
                  "name": "door"
                },
                2,
                {
                  "fn": "lt",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "winRoll"
                    },
                    0.8
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
      "id": "solidKind",
      "type": "setAttribute",
      "params": {
        "name": "kind",
        "domain": "point",
        "type": "string",
        "tupleSize": 1,
        "value": 0,
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "wall",
        "seed": 0
      }
    },
    {
      "id": "solidBays",
      "type": "filterByExpression",
      "params": {
        "predicate": {
          "fn": "eq",
          "args": [
            {
              "fn": "attribute",
              "name": "bk"
            },
            0
          ]
        },
        "seed": 0,
        "topology": "drop"
      }
    },
    {
      "id": "openBays",
      "type": "filterByExpression",
      "params": {
        "predicate": {
          "fn": "ge",
          "args": [
            {
              "fn": "attribute",
              "name": "bk"
            },
            1
          ]
        },
        "seed": 0,
        "topology": "drop"
      }
    },
    {
      "id": "opFan",
      "type": "copyToPoints",
      "params": {
        "targetNames": [
          "lo",
          "hi",
          "lot",
          "wallTint",
          "roofTint",
          "alongX",
          "ua",
          "ub",
          "oa",
          "ob",
          "bk"
        ],
        "targetIndexAttr": "",
        "rotateAttrs": [],
        "sourceGroupAttr": "",
        "targetGroupAttr": "",
        "mirrorAware": true,
        "topology": "drop"
      }
    },
    {
      "id": "opHi",
      "type": "setAttribute",
      "params": {
        "name": "hi",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "vec",
          "args": [
            {
              "fn": "select",
              "args": [
                {
                  "fn": "attribute",
                  "name": "alongX"
                },
                {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "add",
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
                                      "name": "ub"
                                    }
                                  ]
                                },
                                {
                                  "fn": "mul",
                                  "args": [
                                    {
                                      "fn": "eq",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "slot"
                                        },
                                        1
                                      ]
                                    },
                                    {
                                      "fn": "attribute",
                                      "name": "ub"
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "fn": "mul",
                              "args": [
                                {
                                  "fn": "eq",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "slot"
                                    },
                                    2
                                  ]
                                },
                                {
                                  "fn": "attribute",
                                  "name": "oa"
                                }
                              ]
                            }
                          ]
                        },
                        {
                          "fn": "mul",
                          "args": [
                            {
                              "fn": "eq",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "slot"
                                },
                                3
                              ]
                            },
                            {
                              "fn": "attribute",
                              "name": "ub"
                            }
                          ]
                        }
                      ]
                    },
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "eq",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "slot"
                            },
                            4
                          ]
                        },
                        {
                          "fn": "attribute",
                          "name": "ob"
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
                      "name": "hi",
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
                  "fn": "add",
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
                                      "fn": "component",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "lo",
                                          "tupleSize": 3
                                        }
                                      ],
                                      "index": 1
                                    },
                                    {
                                      "fn": "select",
                                      "args": [
                                        {
                                          "fn": "eq",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "bk"
                                            },
                                            2
                                          ]
                                        },
                                        0,
                                        6
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
                                  "fn": "eq",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "slot"
                                    },
                                    1
                                  ]
                                },
                                {
                                  "fn": "component",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "hi",
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
                              "fn": "eq",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "slot"
                                },
                                2
                              ]
                            },
                            {
                              "fn": "add",
                              "args": [
                                {
                                  "fn": "component",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "lo",
                                      "tupleSize": 3
                                    }
                                  ],
                                  "index": 1
                                },
                                12
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
                          "fn": "eq",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "slot"
                            },
                            3
                          ]
                        },
                        {
                          "fn": "add",
                          "args": [
                            {
                              "fn": "component",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "lo",
                                  "tupleSize": 3
                                }
                              ],
                              "index": 1
                            },
                            12
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
                      "fn": "eq",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "slot"
                        },
                        4
                      ]
                    },
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "lo",
                              "tupleSize": 3
                            }
                          ],
                          "index": 1
                        },
                        12
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "fn": "select",
              "args": [
                {
                  "fn": "attribute",
                  "name": "alongX"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "hi",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                },
                {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "add",
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
                                      "name": "ub"
                                    }
                                  ]
                                },
                                {
                                  "fn": "mul",
                                  "args": [
                                    {
                                      "fn": "eq",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "slot"
                                        },
                                        1
                                      ]
                                    },
                                    {
                                      "fn": "attribute",
                                      "name": "ub"
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "fn": "mul",
                              "args": [
                                {
                                  "fn": "eq",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "slot"
                                    },
                                    2
                                  ]
                                },
                                {
                                  "fn": "attribute",
                                  "name": "oa"
                                }
                              ]
                            }
                          ]
                        },
                        {
                          "fn": "mul",
                          "args": [
                            {
                              "fn": "eq",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "slot"
                                },
                                3
                              ]
                            },
                            {
                              "fn": "attribute",
                              "name": "ub"
                            }
                          ]
                        }
                      ]
                    },
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "eq",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "slot"
                            },
                            4
                          ]
                        },
                        {
                          "fn": "attribute",
                          "name": "ob"
                        }
                      ]
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
      "id": "opLo",
      "type": "setAttribute",
      "params": {
        "name": "lo",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "vec",
          "args": [
            {
              "fn": "select",
              "args": [
                {
                  "fn": "attribute",
                  "name": "alongX"
                },
                {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "add",
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
                                      "name": "ua"
                                    }
                                  ]
                                },
                                {
                                  "fn": "mul",
                                  "args": [
                                    {
                                      "fn": "eq",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "slot"
                                        },
                                        1
                                      ]
                                    },
                                    {
                                      "fn": "attribute",
                                      "name": "ua"
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "fn": "mul",
                              "args": [
                                {
                                  "fn": "eq",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "slot"
                                    },
                                    2
                                  ]
                                },
                                {
                                  "fn": "attribute",
                                  "name": "ua"
                                }
                              ]
                            }
                          ]
                        },
                        {
                          "fn": "mul",
                          "args": [
                            {
                              "fn": "eq",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "slot"
                                },
                                3
                              ]
                            },
                            {
                              "fn": "attribute",
                              "name": "ob"
                            }
                          ]
                        }
                      ]
                    },
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "eq",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "slot"
                            },
                            4
                          ]
                        },
                        {
                          "fn": "attribute",
                          "name": "oa"
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
                      "name": "lo",
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
                  "fn": "add",
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
                                  "fn": "component",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "lo",
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
                                  "fn": "eq",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "slot"
                                    },
                                    1
                                  ]
                                },
                                {
                                  "fn": "add",
                                  "args": [
                                    {
                                      "fn": "component",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "lo",
                                          "tupleSize": 3
                                        }
                                      ],
                                      "index": 1
                                    },
                                    12
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
                              "fn": "eq",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "slot"
                                },
                                2
                              ]
                            },
                            {
                              "fn": "add",
                              "args": [
                                {
                                  "fn": "component",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "lo",
                                      "tupleSize": 3
                                    }
                                  ],
                                  "index": 1
                                },
                                {
                                  "fn": "select",
                                  "args": [
                                    {
                                      "fn": "eq",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "bk"
                                        },
                                        2
                                      ]
                                    },
                                    0,
                                    6
                                  ]
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
                          "fn": "eq",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "slot"
                            },
                            3
                          ]
                        },
                        {
                          "fn": "add",
                          "args": [
                            {
                              "fn": "component",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "lo",
                                  "tupleSize": 3
                                }
                              ],
                              "index": 1
                            },
                            {
                              "fn": "select",
                              "args": [
                                {
                                  "fn": "eq",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "bk"
                                    },
                                    2
                                  ]
                                },
                                0,
                                6
                              ]
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
                      "fn": "eq",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "slot"
                        },
                        4
                      ]
                    },
                    {
                      "fn": "add",
                      "args": [
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "lo",
                              "tupleSize": 3
                            }
                          ],
                          "index": 1
                        },
                        {
                          "fn": "select",
                          "args": [
                            {
                              "fn": "eq",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "bk"
                                },
                                2
                              ]
                            },
                            0,
                            6
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "fn": "select",
              "args": [
                {
                  "fn": "attribute",
                  "name": "alongX"
                },
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "lo",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                },
                {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "add",
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
                                      "name": "ua"
                                    }
                                  ]
                                },
                                {
                                  "fn": "mul",
                                  "args": [
                                    {
                                      "fn": "eq",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "slot"
                                        },
                                        1
                                      ]
                                    },
                                    {
                                      "fn": "attribute",
                                      "name": "ua"
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "fn": "mul",
                              "args": [
                                {
                                  "fn": "eq",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "slot"
                                    },
                                    2
                                  ]
                                },
                                {
                                  "fn": "attribute",
                                  "name": "ua"
                                }
                              ]
                            }
                          ]
                        },
                        {
                          "fn": "mul",
                          "args": [
                            {
                              "fn": "eq",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "slot"
                                },
                                3
                              ]
                            },
                            {
                              "fn": "attribute",
                              "name": "ob"
                            }
                          ]
                        }
                      ]
                    },
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "eq",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "slot"
                            },
                            4
                          ]
                        },
                        {
                          "fn": "attribute",
                          "name": "oa"
                        }
                      ]
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
      "id": "opKind",
      "type": "setAttribute",
      "params": {
        "name": "kind",
        "domain": "point",
        "type": "string",
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
                4
              ]
            },
            {
              "fn": "attribute",
              "name": "bk"
            },
            0
          ]
        },
        "select": 0,
        "values": [
          "wall",
          "glass",
          "door"
        ],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "opKeep",
      "type": "filterByExpression",
      "params": {
        "predicate": {
          "fn": "gt",
          "args": [
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "hi",
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
                      "name": "lo",
                      "tupleSize": 3
                    }
                  ],
                  "index": 1
                }
              ]
            },
            0
          ]
        },
        "seed": 0,
        "topology": "drop"
      }
    },
    {
      "id": "rfRidgeX",
      "type": "setAttribute",
      "params": {
        "name": "ridgeX",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
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
                      "name": "hi",
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
                      "name": "lo",
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
                      "name": "hi",
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
                      "name": "lo",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
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
      "id": "rfShort",
      "type": "setAttribute",
      "params": {
        "name": "short",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "min",
          "args": [
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "hi",
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
                      "name": "lo",
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
                      "name": "hi",
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
                      "name": "lo",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
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
      "id": "rfBlo",
      "type": "setAttribute",
      "params": {
        "name": "blo",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "attribute",
          "name": "lo",
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
      "id": "rfBhi",
      "type": "setAttribute",
      "params": {
        "name": "bhi",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "attribute",
          "name": "hi",
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
      "id": "rfFan",
      "type": "copyToPoints",
      "params": {
        "targetNames": [
          "lo",
          "hi",
          "lot",
          "wallTint",
          "roofTint",
          "ridgeX",
          "short",
          "blo",
          "bhi"
        ],
        "targetIndexAttr": "",
        "rotateAttrs": [],
        "sourceGroupAttr": "",
        "targetGroupAttr": "",
        "mirrorAware": true,
        "topology": "drop"
      }
    },
    {
      "id": "rules42Pts",
      "type": "pointLine",
      "params": {
        "mode": "endpoints",
        "count": 42,
        "start": [
          0,
          0,
          0
        ],
        "end": [
          0,
          0,
          0
        ],
        "includeEnd": true,
        "spacing": 1
      }
    },
    {
      "id": "rules42Seed",
      "type": "setAttribute",
      "params": {
        "name": "seed",
        "domain": "point",
        "type": "u32",
        "tupleSize": 1,
        "value": {
          "fn": "add",
          "args": [
            59,
            {
              "fn": "mul",
              "args": [
                {
                  "fn": "index"
                },
                5119
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
      "id": "rules42",
      "type": "setAttribute",
      "params": {
        "name": "slot",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "index"
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "rfLayer",
      "type": "setAttribute",
      "params": {
        "name": "layer",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "floor",
          "args": [
            {
              "fn": "div",
              "args": [
                {
                  "fn": "attribute",
                  "name": "slot"
                },
                3
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
      "id": "rfPart",
      "type": "setAttribute",
      "params": {
        "name": "part",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "mod",
          "args": [
            {
              "fn": "attribute",
              "name": "slot"
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
      "id": "rfKeep",
      "type": "filterByExpression",
      "params": {
        "predicate": {
          "fn": "gt",
          "args": [
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "attribute",
                  "name": "short"
                },
                {
                  "fn": "mul",
                  "args": [
                    2,
                    {
                      "fn": "attribute",
                      "name": "layer"
                    }
                  ]
                }
              ]
            },
            0
          ]
        },
        "seed": 0,
        "topology": "drop"
      }
    },
    {
      "id": "rfLo",
      "type": "setAttribute",
      "params": {
        "name": "lo",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "vec",
          "args": [
            {
              "fn": "select",
              "args": [
                {
                  "fn": "attribute",
                  "name": "ridgeX"
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
                              "fn": "eq",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "part"
                                },
                                0
                              ]
                            },
                            {
                              "fn": "component",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "blo",
                                  "tupleSize": 3
                                }
                              ],
                              "index": 0
                            }
                          ]
                        },
                        {
                          "fn": "mul",
                          "args": [
                            {
                              "fn": "eq",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "part"
                                },
                                1
                              ]
                            },
                            {
                              "fn": "add",
                              "args": [
                                {
                                  "fn": "component",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "blo",
                                      "tupleSize": 3
                                    }
                                  ],
                                  "index": 0
                                },
                                1
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
                          "fn": "eq",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "part"
                            },
                            2
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
                                  "name": "bhi",
                                  "tupleSize": 3
                                }
                              ],
                              "index": 0
                            },
                            1
                          ]
                        }
                      ]
                    }
                  ]
                },
                {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "blo",
                          "tupleSize": 3
                        }
                      ],
                      "index": 0
                    },
                    {
                      "fn": "attribute",
                      "name": "layer"
                    }
                  ]
                }
              ]
            },
            {
              "fn": "add",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "bhi",
                      "tupleSize": 3
                    }
                  ],
                  "index": 1
                },
                {
                  "fn": "mul",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "layer"
                    },
                    2
                  ]
                }
              ]
            },
            {
              "fn": "select",
              "args": [
                {
                  "fn": "attribute",
                  "name": "ridgeX"
                },
                {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "blo",
                          "tupleSize": 3
                        }
                      ],
                      "index": 2
                    },
                    {
                      "fn": "attribute",
                      "name": "layer"
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
                              "fn": "eq",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "part"
                                },
                                0
                              ]
                            },
                            {
                              "fn": "component",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "blo",
                                  "tupleSize": 3
                                }
                              ],
                              "index": 2
                            }
                          ]
                        },
                        {
                          "fn": "mul",
                          "args": [
                            {
                              "fn": "eq",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "part"
                                },
                                1
                              ]
                            },
                            {
                              "fn": "add",
                              "args": [
                                {
                                  "fn": "component",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "blo",
                                      "tupleSize": 3
                                    }
                                  ],
                                  "index": 2
                                },
                                1
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
                          "fn": "eq",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "part"
                            },
                            2
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
                                  "name": "bhi",
                                  "tupleSize": 3
                                }
                              ],
                              "index": 2
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
      "id": "rfHi",
      "type": "setAttribute",
      "params": {
        "name": "hi",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "vec",
          "args": [
            {
              "fn": "select",
              "args": [
                {
                  "fn": "attribute",
                  "name": "ridgeX"
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
                              "fn": "eq",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "part"
                                },
                                0
                              ]
                            },
                            {
                              "fn": "add",
                              "args": [
                                {
                                  "fn": "component",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "blo",
                                      "tupleSize": 3
                                    }
                                  ],
                                  "index": 0
                                },
                                1
                              ]
                            }
                          ]
                        },
                        {
                          "fn": "mul",
                          "args": [
                            {
                              "fn": "eq",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "part"
                                },
                                1
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
                                      "name": "bhi",
                                      "tupleSize": 3
                                    }
                                  ],
                                  "index": 0
                                },
                                1
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
                          "fn": "eq",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "part"
                            },
                            2
                          ]
                        },
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "bhi",
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
                  "fn": "sub",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "bhi",
                          "tupleSize": 3
                        }
                      ],
                      "index": 0
                    },
                    {
                      "fn": "attribute",
                      "name": "layer"
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
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "bhi",
                          "tupleSize": 3
                        }
                      ],
                      "index": 1
                    },
                    {
                      "fn": "mul",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "layer"
                        },
                        2
                      ]
                    }
                  ]
                },
                2
              ]
            },
            {
              "fn": "select",
              "args": [
                {
                  "fn": "attribute",
                  "name": "ridgeX"
                },
                {
                  "fn": "sub",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "bhi",
                          "tupleSize": 3
                        }
                      ],
                      "index": 2
                    },
                    {
                      "fn": "attribute",
                      "name": "layer"
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
                              "fn": "eq",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "part"
                                },
                                0
                              ]
                            },
                            {
                              "fn": "add",
                              "args": [
                                {
                                  "fn": "component",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "blo",
                                      "tupleSize": 3
                                    }
                                  ],
                                  "index": 2
                                },
                                1
                              ]
                            }
                          ]
                        },
                        {
                          "fn": "mul",
                          "args": [
                            {
                              "fn": "eq",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "part"
                                },
                                1
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
                                      "name": "bhi",
                                      "tupleSize": 3
                                    }
                                  ],
                                  "index": 2
                                },
                                1
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
                          "fn": "eq",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "part"
                            },
                            2
                          ]
                        },
                        {
                          "fn": "component",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "bhi",
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
        },
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "rfKind",
      "type": "setAttribute",
      "params": {
        "name": "kind",
        "domain": "point",
        "type": "string",
        "tupleSize": 1,
        "value": {
          "fn": "eq",
          "args": [
            {
              "fn": "attribute",
              "name": "part"
            },
            1
          ]
        },
        "select": 0,
        "values": [
          "wall",
          "roof"
        ],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "occPieces",
      "type": "mergePoints",
      "params": {}
    },
    {
      "id": "occluder",
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
                  "name": "lo",
                  "tupleSize": 3
                },
                {
                  "fn": "attribute",
                  "name": "hi",
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
      "id": "gLo",
      "type": "setAttribute",
      "params": {
        "name": "lo",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "vec",
          "args": [
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "div",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "lot",
                          "tupleSize": 3
                        }
                      ],
                      "index": 0
                    },
                    2
                  ]
                },
                16
              ]
            },
            0,
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "div",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "lot",
                          "tupleSize": 3
                        }
                      ],
                      "index": 2
                    },
                    2
                  ]
                },
                16
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
      "id": "gHi",
      "type": "setAttribute",
      "params": {
        "name": "hi",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "vec",
          "args": [
            {
              "fn": "add",
              "args": [
                {
                  "fn": "div",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "lot",
                          "tupleSize": 3
                        }
                      ],
                      "index": 0
                    },
                    2
                  ]
                },
                16
              ]
            },
            1,
            {
              "fn": "add",
              "args": [
                {
                  "fn": "div",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "lot",
                          "tupleSize": 3
                        }
                      ],
                      "index": 2
                    },
                    2
                  ]
                },
                16
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
      "id": "gKind",
      "type": "setAttribute",
      "params": {
        "name": "kind",
        "domain": "point",
        "type": "string",
        "tupleSize": 1,
        "value": 0,
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "ground",
        "seed": 0
      }
    },
    {
      "id": "pieces",
      "type": "mergePoints",
      "params": {}
    },
    {
      "id": "tint",
      "type": "setAttribute",
      "params": {
        "name": "tint",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "byAttribute",
          "name": "kind",
          "cases": {
            "wall": {
              "fn": "vec",
              "args": [
                {
                  "fn": "lookup",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "wallTint"
                    }
                  ],
                  "table": [
                    0.93,
                    0.85,
                    0.7,
                    0.95,
                    0.6
                  ]
                },
                {
                  "fn": "lookup",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "wallTint"
                    }
                  ],
                  "table": [
                    0.92,
                    0.75,
                    0.16,
                    0.76,
                    0.63
                  ]
                },
                {
                  "fn": "lookup",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "wallTint"
                    }
                  ],
                  "table": [
                    0.88,
                    0.55,
                    0.12,
                    0.16,
                    0.64
                  ]
                }
              ]
            },
            "roof": {
              "fn": "vec",
              "args": [
                {
                  "fn": "lookup",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "roofTint"
                    }
                  ],
                  "table": [
                    0.42,
                    0.3,
                    0.2
                  ]
                },
                {
                  "fn": "lookup",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "roofTint"
                    }
                  ],
                  "table": [
                    0.1,
                    0.33,
                    0.32
                  ]
                },
                {
                  "fn": "lookup",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "roofTint"
                    }
                  ],
                  "table": [
                    0.08,
                    0.36,
                    0.18
                  ]
                }
              ]
            },
            "glass": [
              0.55,
              0.8,
              0.95
            ],
            "door": [
              0.42,
              0.25,
              0.12
            ],
            "floor": [
              0.62,
              0.62,
              0.6
            ],
            "ground": [
              0.3,
              0.6,
              0.25
            ]
          },
          "default": [
            1,
            0,
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
      "id": "bounds",
      "type": "setBounds",
      "params": {
        "boundsMin": {
          "fn": "vec",
          "args": [
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "lo",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                },
                {
                  "fn": "div",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "lot",
                          "tupleSize": 3
                        }
                      ],
                      "index": 0
                    },
                    2
                  ]
                }
              ]
            },
            {
              "fn": "mul",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "lo",
                      "tupleSize": 3
                    }
                  ],
                  "index": 1
                },
                0.4
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
                      "name": "lo",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                },
                {
                  "fn": "div",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "lot",
                          "tupleSize": 3
                        }
                      ],
                      "index": 2
                    },
                    2
                  ]
                }
              ]
            }
          ]
        },
        "boundsMax": {
          "fn": "vec",
          "args": [
            {
              "fn": "sub",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "hi",
                      "tupleSize": 3
                    }
                  ],
                  "index": 0
                },
                {
                  "fn": "div",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "lot",
                          "tupleSize": 3
                        }
                      ],
                      "index": 0
                    },
                    2
                  ]
                }
              ]
            },
            {
              "fn": "mul",
              "args": [
                {
                  "fn": "component",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "hi",
                      "tupleSize": 3
                    }
                  ],
                  "index": 1
                },
                0.4
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
                      "name": "hi",
                      "tupleSize": 3
                    }
                  ],
                  "index": 2
                },
                {
                  "fn": "div",
                  "args": [
                    {
                      "fn": "component",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "lot",
                          "tupleSize": 3
                        }
                      ],
                      "index": 2
                    },
                    2
                  ]
                }
              ]
            }
          ]
        }
      }
    },
    {
      "id": "pack",
      "type": "packBricks",
      "params": {
        "minAttr": "boundsMin",
        "maxAttr": "boundsMax",
        "pitch": [
          1,
          0.4,
          1
        ],
        "origin": [
          0,
          0,
          0
        ],
        "bricks": [
          2,
          8,
          3,
          2,
          6,
          3,
          2,
          4,
          3,
          2,
          3,
          3,
          2,
          2,
          3,
          1,
          8,
          3,
          1,
          6,
          3,
          1,
          4,
          3,
          1,
          3,
          3,
          1,
          2,
          3,
          1,
          1,
          3,
          2,
          16,
          1,
          2,
          12,
          1,
          2,
          10,
          1,
          2,
          8,
          1,
          2,
          6,
          1,
          2,
          4,
          1,
          2,
          3,
          1,
          2,
          2,
          1,
          1,
          12,
          1,
          1,
          10,
          1,
          1,
          8,
          1,
          1,
          6,
          1,
          1,
          4,
          1,
          1,
          3,
          1,
          1,
          2,
          1,
          1,
          1,
          1,
          32,
          32,
          1
        ],
        "groupBy": [
          "kind",
          "tint"
        ],
        "stagger": 3,
        "bond": 16,
        "studMode": "all",
        "islandsAttr": "islands"
      }
    },
    {
      "id": "connect",
      "type": "brickConnectivity",
      "params": {
        "minAttr": "boundsMin",
        "maxAttr": "boundsMax",
        "pitch": [
          1,
          0.4,
          1
        ],
        "origin": [
          0,
          0,
          0
        ],
        "islandAttr": "island",
        "stepAttr": "step",
        "islandsAttr": "islands"
      }
    },
    {
      "id": "shownAt",
      "type": "setAttribute",
      "params": {
        "name": "shownAt",
        "domain": "point",
        "type": "f32",
        "tupleSize": 1,
        "value": {
          "fn": "select",
          "args": [
            {
              "fn": "lt",
              "args": [
                {
                  "fn": "attribute",
                  "name": "step"
                },
                0
              ]
            },
            60,
            {
              "fn": "attribute",
              "name": "step"
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
      "id": "built",
      "type": "filterByExpression",
      "params": {
        "predicate": {
          "fn": "le",
          "args": [
            {
              "fn": "attribute",
              "name": "shownAt"
            },
            {
              "fn": "param",
              "name": "buildStep"
            }
          ]
        },
        "seed": 0,
        "topology": "drop"
      }
    },
    {
      "id": "gap",
      "type": "setAttribute",
      "params": {
        "name": "scale",
        "domain": "point",
        "type": "f32",
        "tupleSize": 3,
        "value": {
          "fn": "sub",
          "args": [
            {
              "fn": "attribute",
              "name": "scale",
              "tupleSize": 3
            },
            0.04
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
      "id": "bricks",
      "type": "spawnInstances",
      "params": {
        "assetId": "brick",
        "assetAttr": "",
        "colorAttr": "tint",
        "instanceAttrs": []
      }
    },
    {
      "id": "stepOn",
      "type": "transferByIndex",
      "params": {
        "index": {
          "fn": "attribute",
          "name": "brickId"
        },
        "attributes": [
          "shownAt"
        ],
        "outNames": [
          "stepOn"
        ],
        "outOfRange": "clamp",
        "hitAttr": "",
        "missCountAttr": ""
      }
    },
    {
      "id": "stepAbove",
      "type": "transferByIndex",
      "params": {
        "index": {
          "fn": "attribute",
          "name": "brickAbove"
        },
        "attributes": [
          "shownAt"
        ],
        "outNames": [
          "stepAbove"
        ],
        "outOfRange": "miss",
        "hitAttr": "",
        "missCountAttr": ""
      }
    },
    {
      "id": "showing",
      "type": "filterByExpression",
      "params": {
        "predicate": {
          "fn": "mul",
          "args": [
            {
              "fn": "le",
              "args": [
                {
                  "fn": "attribute",
                  "name": "stepOn"
                },
                {
                  "fn": "param",
                  "name": "buildStep"
                }
              ]
            },
            {
              "fn": "max",
              "args": [
                {
                  "fn": "lt",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "brickAbove"
                    },
                    0
                  ]
                },
                {
                  "fn": "gt",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "stepAbove"
                    },
                    {
                      "fn": "param",
                      "name": "buildStep"
                    }
                  ]
                }
              ]
            }
          ]
        },
        "seed": 0,
        "topology": "drop"
      }
    },
    {
      "id": "studs",
      "type": "spawnInstances",
      "params": {
        "assetId": "stud",
        "assetAttr": "",
        "colorAttr": "tint",
        "instanceAttrs": []
      }
    },
    {
      "id": "brickMesh",
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
        "flip": false,
        "normals": false
      }
    },
    {
      "id": "studOutline",
      "type": "subgraph",
      "params": {
        "count": 12,
        "size": [
          0.3,
          0.3,
          0.3
        ],
        "rotate": [
          0,
          0,
          0
        ],
        "center": [
          0,
          -0.02,
          0
        ]
      },
      "ref": {
        "name": "shape/path-loop"
      }
    },
    {
      "id": "studMesh",
      "type": "extrudePolygon",
      "params": {
        "distance": 0.2125,
        "direction": "+y",
        "vector": [
          0,
          1,
          0
        ],
        "caps": "top",
        "sides": true
      }
    }
  ],
  "connections": [
    {
      "from": [
        "lotPt",
        "out"
      ],
      "to": [
        "lotSize",
        "in"
      ]
    },
    {
      "from": [
        "lotSize",
        "out"
      ],
      "to": [
        "lotLo",
        "in"
      ]
    },
    {
      "from": [
        "lotLo",
        "out"
      ],
      "to": [
        "lotHi",
        "in"
      ]
    },
    {
      "from": [
        "lotHi",
        "out"
      ],
      "to": [
        "b1Ax",
        "in"
      ]
    },
    {
      "from": [
        "b1Ax",
        "out"
      ],
      "to": [
        "b1Can",
        "in"
      ]
    },
    {
      "from": [
        "b1Can",
        "out"
      ],
      "to": [
        "b1Cut",
        "in"
      ]
    },
    {
      "from": [
        "rules2Pts",
        "out"
      ],
      "to": [
        "rules2Seed",
        "in"
      ]
    },
    {
      "from": [
        "rules2Seed",
        "out"
      ],
      "to": [
        "rules2",
        "in"
      ]
    },
    {
      "from": [
        "rules2",
        "out"
      ],
      "to": [
        "b1Fan",
        "source"
      ]
    },
    {
      "from": [
        "b1Cut",
        "out"
      ],
      "to": [
        "b1Fan",
        "target"
      ]
    },
    {
      "from": [
        "b1Fan",
        "out"
      ],
      "to": [
        "b1Keep",
        "in"
      ]
    },
    {
      "from": [
        "b1Keep",
        "out"
      ],
      "to": [
        "b1Lo",
        "in"
      ]
    },
    {
      "from": [
        "b1Lo",
        "out"
      ],
      "to": [
        "b1Hi",
        "in"
      ]
    },
    {
      "from": [
        "b1Hi",
        "out"
      ],
      "to": [
        "b2Ax",
        "in"
      ]
    },
    {
      "from": [
        "b2Ax",
        "out"
      ],
      "to": [
        "b2Can",
        "in"
      ]
    },
    {
      "from": [
        "b2Can",
        "out"
      ],
      "to": [
        "b2Cut",
        "in"
      ]
    },
    {
      "from": [
        "rules2",
        "out"
      ],
      "to": [
        "b2Fan",
        "source"
      ]
    },
    {
      "from": [
        "b2Cut",
        "out"
      ],
      "to": [
        "b2Fan",
        "target"
      ]
    },
    {
      "from": [
        "b2Fan",
        "out"
      ],
      "to": [
        "b2Keep",
        "in"
      ]
    },
    {
      "from": [
        "b2Keep",
        "out"
      ],
      "to": [
        "b2Lo",
        "in"
      ]
    },
    {
      "from": [
        "b2Lo",
        "out"
      ],
      "to": [
        "b2Hi",
        "in"
      ]
    },
    {
      "from": [
        "b2Hi",
        "out"
      ],
      "to": [
        "blkStoreys",
        "in"
      ]
    },
    {
      "from": [
        "blkStoreys",
        "out"
      ],
      "to": [
        "blkWall",
        "in"
      ]
    },
    {
      "from": [
        "blkWall",
        "out"
      ],
      "to": [
        "blkRoof",
        "in"
      ]
    },
    {
      "from": [
        "blkRoof",
        "out"
      ],
      "to": [
        "blkHi",
        "in"
      ]
    },
    {
      "from": [
        "blkHi",
        "out"
      ],
      "to": [
        "blkExt",
        "in"
      ]
    },
    {
      "from": [
        "rules3Pts",
        "out"
      ],
      "to": [
        "rules3Seed",
        "in"
      ]
    },
    {
      "from": [
        "rules3Seed",
        "out"
      ],
      "to": [
        "rules3",
        "in"
      ]
    },
    {
      "from": [
        "rules3",
        "out"
      ],
      "to": [
        "stFan",
        "source"
      ]
    },
    {
      "from": [
        "blkExt",
        "out"
      ],
      "to": [
        "stFan",
        "target"
      ]
    },
    {
      "from": [
        "stFan",
        "out"
      ],
      "to": [
        "stKeep",
        "in"
      ]
    },
    {
      "from": [
        "stKeep",
        "out"
      ],
      "to": [
        "stLevel",
        "in"
      ]
    },
    {
      "from": [
        "stLevel",
        "out"
      ],
      "to": [
        "stLo",
        "in"
      ]
    },
    {
      "from": [
        "stLo",
        "out"
      ],
      "to": [
        "stHi",
        "in"
      ]
    },
    {
      "from": [
        "rules5Pts",
        "out"
      ],
      "to": [
        "rules5Seed",
        "in"
      ]
    },
    {
      "from": [
        "rules5Seed",
        "out"
      ],
      "to": [
        "rules5",
        "in"
      ]
    },
    {
      "from": [
        "rules5",
        "out"
      ],
      "to": [
        "ptFan",
        "source"
      ]
    },
    {
      "from": [
        "stHi",
        "out"
      ],
      "to": [
        "ptFan",
        "target"
      ]
    },
    {
      "from": [
        "ptFan",
        "out"
      ],
      "to": [
        "ptHi",
        "in"
      ]
    },
    {
      "from": [
        "ptHi",
        "out"
      ],
      "to": [
        "ptLo",
        "in"
      ]
    },
    {
      "from": [
        "ptLo",
        "out"
      ],
      "to": [
        "ptWall",
        "in"
      ]
    },
    {
      "from": [
        "ptWall",
        "out"
      ],
      "to": [
        "ptDoorWall",
        "in"
      ]
    },
    {
      "from": [
        "ptDoorWall",
        "out"
      ],
      "to": [
        "slabs",
        "in"
      ]
    },
    {
      "from": [
        "slabs",
        "out"
      ],
      "to": [
        "slabKind",
        "in"
      ]
    },
    {
      "from": [
        "ptDoorWall",
        "out"
      ],
      "to": [
        "walls",
        "in"
      ]
    },
    {
      "from": [
        "blkExt",
        "out"
      ],
      "to": [
        "ceilLo",
        "in"
      ]
    },
    {
      "from": [
        "ceilLo",
        "out"
      ],
      "to": [
        "ceilKind",
        "in"
      ]
    },
    {
      "from": [
        "walls",
        "out"
      ],
      "to": [
        "wAlong",
        "in"
      ]
    },
    {
      "from": [
        "wAlong",
        "out"
      ],
      "to": [
        "wLen",
        "in"
      ]
    },
    {
      "from": [
        "wLen",
        "out"
      ],
      "to": [
        "wBays",
        "in"
      ]
    },
    {
      "from": [
        "wBays",
        "out"
      ],
      "to": [
        "wStart",
        "in"
      ]
    },
    {
      "from": [
        "rules8Pts",
        "out"
      ],
      "to": [
        "rules8Seed",
        "in"
      ]
    },
    {
      "from": [
        "rules8Seed",
        "out"
      ],
      "to": [
        "rules8",
        "in"
      ]
    },
    {
      "from": [
        "rules8",
        "out"
      ],
      "to": [
        "bayFan",
        "source"
      ]
    },
    {
      "from": [
        "wStart",
        "out"
      ],
      "to": [
        "bayFan",
        "target"
      ]
    },
    {
      "from": [
        "bayFan",
        "out"
      ],
      "to": [
        "bayKeep",
        "in"
      ]
    },
    {
      "from": [
        "probe",
        "out"
      ],
      "to": [
        "probeAlong",
        "in"
      ]
    },
    {
      "from": [
        "probeAlong",
        "out"
      ],
      "to": [
        "covered",
        "path"
      ]
    },
    {
      "from": [
        "occluder",
        "out"
      ],
      "to": [
        "covered",
        "boxes"
      ]
    },
    {
      "from": [
        "bayKeep",
        "out"
      ],
      "to": [
        "bayA",
        "in"
      ]
    },
    {
      "from": [
        "bayA",
        "out"
      ],
      "to": [
        "bayB",
        "in"
      ]
    },
    {
      "from": [
        "bayB",
        "out"
      ],
      "to": [
        "bayHi",
        "in"
      ]
    },
    {
      "from": [
        "bayHi",
        "out"
      ],
      "to": [
        "bayLo",
        "in"
      ]
    },
    {
      "from": [
        "bayLo",
        "out"
      ],
      "to": [
        "bayDoor",
        "in"
      ]
    },
    {
      "from": [
        "bayDoor",
        "out"
      ],
      "to": [
        "opW",
        "in"
      ]
    },
    {
      "from": [
        "opW",
        "out"
      ],
      "to": [
        "opA",
        "in"
      ]
    },
    {
      "from": [
        "opA",
        "out"
      ],
      "to": [
        "opB",
        "in"
      ]
    },
    {
      "from": [
        "opB",
        "out"
      ],
      "to": [
        "winRoll",
        "in"
      ]
    },
    {
      "from": [
        "winRoll",
        "out"
      ],
      "to": [
        "probe",
        "in"
      ]
    },
    {
      "from": [
        "covered",
        "out"
      ],
      "to": [
        "bayKind",
        "in"
      ]
    },
    {
      "from": [
        "bayKind",
        "out"
      ],
      "to": [
        "solidBays",
        "in"
      ]
    },
    {
      "from": [
        "solidBays",
        "out"
      ],
      "to": [
        "solidKind",
        "in"
      ]
    },
    {
      "from": [
        "bayKind",
        "out"
      ],
      "to": [
        "openBays",
        "in"
      ]
    },
    {
      "from": [
        "rules5",
        "out"
      ],
      "to": [
        "opFan",
        "source"
      ]
    },
    {
      "from": [
        "openBays",
        "out"
      ],
      "to": [
        "opFan",
        "target"
      ]
    },
    {
      "from": [
        "opFan",
        "out"
      ],
      "to": [
        "opHi",
        "in"
      ]
    },
    {
      "from": [
        "opHi",
        "out"
      ],
      "to": [
        "opLo",
        "in"
      ]
    },
    {
      "from": [
        "opLo",
        "out"
      ],
      "to": [
        "opKind",
        "in"
      ]
    },
    {
      "from": [
        "opKind",
        "out"
      ],
      "to": [
        "opKeep",
        "in"
      ]
    },
    {
      "from": [
        "blkExt",
        "out"
      ],
      "to": [
        "rfRidgeX",
        "in"
      ]
    },
    {
      "from": [
        "rfRidgeX",
        "out"
      ],
      "to": [
        "rfShort",
        "in"
      ]
    },
    {
      "from": [
        "rfShort",
        "out"
      ],
      "to": [
        "rfBlo",
        "in"
      ]
    },
    {
      "from": [
        "rfBlo",
        "out"
      ],
      "to": [
        "rfBhi",
        "in"
      ]
    },
    {
      "from": [
        "rules42Pts",
        "out"
      ],
      "to": [
        "rules42Seed",
        "in"
      ]
    },
    {
      "from": [
        "rules42Seed",
        "out"
      ],
      "to": [
        "rules42",
        "in"
      ]
    },
    {
      "from": [
        "rules42",
        "out"
      ],
      "to": [
        "rfFan",
        "source"
      ]
    },
    {
      "from": [
        "rfBhi",
        "out"
      ],
      "to": [
        "rfFan",
        "target"
      ]
    },
    {
      "from": [
        "rfFan",
        "out"
      ],
      "to": [
        "rfLayer",
        "in"
      ]
    },
    {
      "from": [
        "rfLayer",
        "out"
      ],
      "to": [
        "rfPart",
        "in"
      ]
    },
    {
      "from": [
        "rfPart",
        "out"
      ],
      "to": [
        "rfKeep",
        "in"
      ]
    },
    {
      "from": [
        "rfKeep",
        "out"
      ],
      "to": [
        "rfLo",
        "in"
      ]
    },
    {
      "from": [
        "rfLo",
        "out"
      ],
      "to": [
        "rfHi",
        "in"
      ]
    },
    {
      "from": [
        "rfHi",
        "out"
      ],
      "to": [
        "rfKind",
        "in"
      ]
    },
    {
      "from": [
        "blkExt",
        "out"
      ],
      "to": [
        "occPieces",
        "in"
      ]
    },
    {
      "from": [
        "rfKind",
        "out"
      ],
      "to": [
        "occPieces",
        "in"
      ]
    },
    {
      "from": [
        "occPieces",
        "out"
      ],
      "to": [
        "occluder",
        "in"
      ]
    },
    {
      "from": [
        "lotHi",
        "out"
      ],
      "to": [
        "gLo",
        "in"
      ]
    },
    {
      "from": [
        "gLo",
        "out"
      ],
      "to": [
        "gHi",
        "in"
      ]
    },
    {
      "from": [
        "gHi",
        "out"
      ],
      "to": [
        "gKind",
        "in"
      ]
    },
    {
      "from": [
        "gKind",
        "out"
      ],
      "to": [
        "pieces",
        "in"
      ]
    },
    {
      "from": [
        "slabKind",
        "out"
      ],
      "to": [
        "pieces",
        "in"
      ]
    },
    {
      "from": [
        "ceilKind",
        "out"
      ],
      "to": [
        "pieces",
        "in"
      ]
    },
    {
      "from": [
        "solidKind",
        "out"
      ],
      "to": [
        "pieces",
        "in"
      ]
    },
    {
      "from": [
        "opKeep",
        "out"
      ],
      "to": [
        "pieces",
        "in"
      ]
    },
    {
      "from": [
        "rfKind",
        "out"
      ],
      "to": [
        "pieces",
        "in"
      ]
    },
    {
      "from": [
        "pieces",
        "out"
      ],
      "to": [
        "tint",
        "in"
      ]
    },
    {
      "from": [
        "tint",
        "out"
      ],
      "to": [
        "bounds",
        "in"
      ]
    },
    {
      "from": [
        "bounds",
        "out"
      ],
      "to": [
        "pack",
        "in"
      ]
    },
    {
      "from": [
        "pack",
        "out"
      ],
      "to": [
        "connect",
        "in"
      ]
    },
    {
      "from": [
        "connect",
        "out"
      ],
      "to": [
        "shownAt",
        "in"
      ]
    },
    {
      "from": [
        "shownAt",
        "out"
      ],
      "to": [
        "built",
        "in"
      ]
    },
    {
      "from": [
        "built",
        "out"
      ],
      "to": [
        "gap",
        "in"
      ]
    },
    {
      "from": [
        "gap",
        "out"
      ],
      "to": [
        "bricks",
        "in"
      ]
    },
    {
      "from": [
        "pack",
        "studs"
      ],
      "to": [
        "stepOn",
        "in"
      ]
    },
    {
      "from": [
        "shownAt",
        "out"
      ],
      "to": [
        "stepOn",
        "source"
      ]
    },
    {
      "from": [
        "stepOn",
        "out"
      ],
      "to": [
        "stepAbove",
        "in"
      ]
    },
    {
      "from": [
        "shownAt",
        "out"
      ],
      "to": [
        "stepAbove",
        "source"
      ]
    },
    {
      "from": [
        "stepAbove",
        "out"
      ],
      "to": [
        "showing",
        "in"
      ]
    },
    {
      "from": [
        "showing",
        "out"
      ],
      "to": [
        "studs",
        "in"
      ]
    },
    {
      "from": [
        "studOutline",
        "out"
      ],
      "to": [
        "studMesh",
        "in"
      ]
    }
  ],
  "outputs": [
    {
      "id": "bricks",
      "pin": "instances",
      "name": "bricks"
    },
    {
      "id": "studs",
      "pin": "instances",
      "name": "studs"
    },
    {
      "id": "brickMesh",
      "pin": "out",
      "name": "brick",
      "role": "asset"
    },
    {
      "id": "studMesh",
      "pin": "out",
      "name": "stud",
      "role": "asset"
    }
  ]
}
`;export{e as default};