var e=`{
  "formatVersion": 1,
  "seed": 1889,
  "meta": {
    "title": "A brick house split on a stud lattice and built in bricks",
    "description": "A SHORT TERRACE OF HOUSES DERIVED BY A SPLIT GRAMMAR ON AN INTEGER LATTICE, THEN BUILT IN BRICKS. Every terminal of the grammar is an axis-aligned box whose corners are WHOLE NUMBERS -- x and z in studs, y in plates, a plate 0.4 of a stud -- carrying a string \`kind\` (wall, glass, door, roof, floor, ground) and a palette colour; \`packBricks\` turns those boxes into catalogue bricks, and the house is drawn as two instance batches, bricks and the studs left showing. THE GRAMMAR IS STAGED, NOT RECURSIVE. The derivation is lot -> blocks -> storeys -> a floor slab and four walls -> bays -> sill, head, two jambs and the opening, with a ceiling slab over each block's top storey and a second branch from each block to the layers of a stepped gable roof standing on it. Every one of those rules has the SAME shape: decide on the parent, fan it out with \`repeatPoints\`, and rewrite each child's box from its copy index. THE FAN IS \`repeatPoints\` WITH THE CELL'S OWN COUNT: a block splits into \`1 + can\` children (one when it is too small to leave two halves), a block stacks \`storeys\` storeys, a wall takes \`nb\` bays, a block's roof takes \`ceil(short / 2)\` layers and each layer its three pieces, and an opening takes five pieces -- sill, head, two jambs and the opening itself -- or four for a door, which has no sill. Each cell is repeated exactly as many times as it needs, so nothing is made only to be filtered away and no fan has a ceiling to outgrow. The copies carry every attribute of the parent, so a child knows everything its parent decided, and each copy gets its own seed, so the children still differ in every random draw. The copy index lands in \`slot\` (in \`layer\` and \`part\` for the roof, two repeats in a row), and the box is rewritten piecewise by it as sums of \`eq(slot, i) * value_i\`. The stage decides what a cell is, so no rule dispatches on a string; the one string dispatch is the palette, a \`byAttribute\` on \`kind\` that is the single table of colours. The three split graphs in this corpus spell a rule the same way -- decide on the parent, fan out with \`repeatPoints\`, and select each child's box by \`slot\` in one \`setBounds\` -- and differ in how often they apply one. \`examples-facade\` and \`examples-floorplan\` apply ONE rule recursively under \`repeatUntil\` until every cell is small enough; this house applies a DIFFERENT rule at each stage, each a bounded number of times, so its stages are written out rather than looped. THE CUT IS SNAPPED, AND DECIDED ON THE PARENT: \`floor(span * f + 0.5)\` clamped so neither half falls under six studs, drawn before the fan, as the facade and floorplan draw theirs, so both halves carry the same value and meet at one integer coordinate -- drawn after the fan it would differ per child, because the children have different seeds. THE WORKING BOX IS THE STANDARD \`boundsMin\`/\`boundsMax\`, IN LATTICE UNITS, and every rewrite of it is ONE \`setBounds\`. That matters: \`setBounds\` resolves both corners against the box it was handed before writing either, so a rewrite that computes the new minimum from the old maximum, or the reverse, can never read a corner it has just replaced. The roof's pieces, each a function of every component of the block's box, are written that way with nothing carried aside. The last \`setBounds\` converts the lattice to world units and centres the lot, and that is the box \`packBricks\` reads. A WINDOW GOES ONLY WHERE A WALL IS EXPOSED, and exposure is computed rather than assumed. Blocks share party walls, and a tall block beside a low one has a wall that is covered at the bottom and open above. Each candidate opening places a probe half a stud outside its wall at the BOTTOM of where the opening would be, and \`pathCoverage\` with \`near\` = \`far\` = 0 asks whether it lies inside any block or roof layer, the boxes read as points with their size from their corners. Bottom is enough because roof layers stack on blocks that stand on the ground, with nothing overhanging: if the bottom of the opening is free, everything above it in that column is free too. ACROSS the opening it takes one point PER STUD, because a neighbour ending mid-window or a roof layer stepping in can cover part of the width, and a box on the lattice that overlaps the opening at all contains one of its studs; openings are at most two studs wide, so two rays spread along the wall. The window-or-solid roll is drawn BEFORE the probe moves the point: a random draw hashes the point's identity, its position as well as its seed, so a roll drawn after the probe would change whenever the probe did. Doors go on the ground floor of the first lot-edge wall, south then north, in the middle bay; a z split happens at most once, so every block has one. THE BUILD. \`packBricks\` reads the pieces' world corners, keeps \`kind\` and colour apart with \`groupBy\`, and lays every wall in full bricks with the joints staggered course to course; the catalogue is the default one with a 32 x 32 BASEPLATE appended through \`extraBricks\`, and the ground is exactly that baseplate -- one piece under the whole lot, not a margin of loose plates. Neighbouring blocks each build their own wall, so a party wall is two studs thick, and the stud at each gable end of a roof layer has kind \`wall\` (it is the gable, in the wall's colour). THE MESHES ARE THE GRAPH'S OWN: two outputs carry \`role: \\"asset\\"\`, so \`brick\` (a unit box centred on its point) and \`stud\` (a twelve-sided stud, its outline the \`shape/path-loop\` primitive) are the meshes the two spawners' asset ids resolve to, in the editor and in \`pcg render\`, rather than placeholders. One box serves every brick because a brick point's \`scale\` is its own-frame size and its \`rot\` the quarter turn of a brick laid sideways. A hairline gap is taken off every brick's \`scale\` so the joints read; a brick is centred on its point, so that lowers its drawn top by half the gap, and the stud mesh stands the same half-gap below its point so a stud sits on the brick as drawn. WHAT HOLDS TOGETHER is measured, not assumed. \`brickConnectivity\` numbers the pieces stud clutch alone holds together and gives every brick a build STEP: courses bottom up, a brick placed when it stands on the baseplate or grips one already placed, a plate hung under a floor placed with the floor. A floor or a roof's first course laid over an empty room is the hard case -- its plates touch nothing below, and the ones that reach no wall are held only by what is laid on them. Three things in the packer answer it. Plates up to 2x16 in the catalogue, so a floor's plates reach a wall. \`bond\`, which rewards a placement for every two pieces it joins, so the course above bridges the loose ones. And WHAT HOLDS, weighed before the score, for the floor that no course above can bridge: an upper storey's slab is ONE plate thick, over the empty room below and under the empty room above, with walls only at its edges, so each of its plates has to reach a wall by itself. A plate with nothing under it and nothing over it is loose in every build order, and a plate that would leave the cell beside it with no held plate left to cover it commits that cell to a loose plate too, so each placement is charged the loose plates it commits the build to and the fewest wins, before the score -- without the charge for the cell beside it, a plate could cut off the strip next to it in an occasional house. A roof over an EMPTY ATTIC was beyond all three -- only its two outer strips stood on walls, and a roof that narrows as it rises has no course wide enough to tie the middle strips back to them -- and that was the grammar's to fix: a house has a ceiling, so each block carries a one-plate ceiling slab over its top storey and the roof stands on it. A two-plate floor slab would have answered the floor from the grammar too, bonding its second course across the first's joints, but at a plate on every storey and some seven per cent more bricks; the packer's rule costs neither, and changes nothing in a house that was already in one piece. A brick no order could attach would still get step -1, which says so: the whole build draws it, and every partial build leaves it out rather than show it hanging in air. THE \`buildStep\` PARAM shows the build as it stands after that step: bricks are kept while their step is at most it, and a stud shows once its brick is placed and until the brick resting on it is. The packer is asked for EVERY stud (\`studMode: all\`), each knowing the brick it stands on and the brick resting on it; the studs go through \`brickConnectivity\` alongside the bricks, which writes on each stud the step of both, so the rule is one filter on the studs with no join. The param's maximum is the tallest a house can stand, in plates -- a step is a distinct course bottom, so no house has more steps than that -- and it is the whole build for every house; the exact range for one house is the \`stepCount\` detail \`brickConnectivity\` writes, steps 0 to stepCount - 1, which is what a host's build-step slider should run over.",
    "tags": [
      "examples",
      "structure",
      "topology"
    ]
  },
  "params": [
    {
      "name": "buildStep",
      "value": 68,
      "min": 0,
      "max": 68,
      "description": "Show the build as it stands after this many steps, counting from 0. A step is one course of the build placed bottom up, with anything hanging under a brick placed alongside it; the default and maximum, 68, is the tallest a house can stand in plates, so it is past every house's last step and shows the whole build -- including any brick no order can attach (step -1), which every smaller value hides rather than draw hanging in air. The exact range for one house is the stepCount detail brickConnectivity writes: steps 0 to stepCount - 1."
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
      "id": "lotBox",
      "type": "setBounds",
      "params": {
        "boundsMin": {
          "fn": "vec",
          "args": [
            0,
            1,
            0
          ]
        },
        "boundsMax": {
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
        }
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
                      "name": "boundsMin",
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
      "type": "repeatPoints",
      "params": {
        "count": {
          "fn": "add",
          "args": [
            1,
            {
              "fn": "attribute",
              "name": "can"
            }
          ]
        },
        "indexAttr": "slot",
        "countAttr": ""
      }
    },
    {
      "id": "b1Box",
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
                      "name": "boundsMin",
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
                  "name": "boundsMin",
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
                      "name": "boundsMax",
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
                  "name": "boundsMax",
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
                      "name": "boundsMax",
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
                      "name": "boundsMin",
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
      "type": "repeatPoints",
      "params": {
        "count": {
          "fn": "add",
          "args": [
            1,
            {
              "fn": "attribute",
              "name": "can"
            }
          ]
        },
        "indexAttr": "slot",
        "countAttr": ""
      }
    },
    {
      "id": "b2Box",
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
                      "name": "boundsMin",
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
                  "name": "boundsMin",
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
                      "name": "boundsMax",
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
                  "name": "boundsMax",
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
                      "name": "boundsMax",
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
      "id": "blkBox",
      "type": "setBounds",
      "params": {
        "boundsMin": {
          "fn": "attribute",
          "name": "boundsMin",
          "tupleSize": 3
        },
        "boundsMax": {
          "fn": "vec",
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
                  "name": "boundsMax",
                  "tupleSize": 3
                }
              ],
              "index": 2
            }
          ]
        }
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
                      "name": "boundsMin",
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
      "type": "repeatPoints",
      "params": {
        "count": {
          "fn": "attribute",
          "name": "storeys"
        },
        "indexAttr": "slot",
        "countAttr": ""
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
      "id": "stBox",
      "type": "setBounds",
      "params": {
        "boundsMin": {
          "fn": "vec",
          "args": [
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
                  "name": "boundsMin",
                  "tupleSize": 3
                }
              ],
              "index": 2
            }
          ]
        },
        "boundsMax": {
          "fn": "vec",
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
                  "name": "boundsMax",
                  "tupleSize": 3
                }
              ],
              "index": 2
            }
          ]
        }
      }
    },
    {
      "id": "ptFan",
      "type": "repeatPoints",
      "params": {
        "count": 5,
        "indexAttr": "slot",
        "countAttr": ""
      }
    },
    {
      "id": "ptBox",
      "type": "setBounds",
      "params": {
        "boundsMin": {
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
                      "name": "boundsMin",
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
                      "name": "boundsMin",
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
                          "name": "boundsMin",
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
                      "name": "boundsMax",
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
                          "name": "boundsMin",
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
                      "name": "boundsMax",
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
                          "name": "boundsMax",
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
        }
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
      "id": "ceilBox",
      "type": "setBounds",
      "params": {
        "boundsMin": {
          "fn": "vec",
          "args": [
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
                  "name": "boundsMin",
                  "tupleSize": 3
                }
              ],
              "index": 2
            }
          ]
        },
        "boundsMax": {
          "fn": "attribute",
          "name": "boundsMax",
          "tupleSize": 3
        }
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
                  "name": "boundsMin",
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
      "type": "repeatPoints",
      "params": {
        "count": {
          "fn": "attribute",
          "name": "nb"
        },
        "indexAttr": "slot",
        "countAttr": ""
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
      "id": "bayBox",
      "type": "setBounds",
      "params": {
        "boundsMin": {
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
                      "name": "boundsMin",
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
                  "name": "boundsMin",
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
                      "name": "boundsMin",
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
        "boundsMax": {
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
                      "name": "boundsMax",
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
                  "name": "boundsMax",
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
                      "name": "boundsMax",
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
        }
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
                                  "name": "boundsMin",
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
                                  "name": "boundsMax",
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
                          "name": "boundsMin",
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
                                  "name": "boundsMin",
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
                                  "name": "boundsMax",
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
              "name": "boundsMax",
              "tupleSize": 3
            },
            {
              "fn": "attribute",
              "name": "boundsMin",
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
      "type": "repeatPoints",
      "params": {
        "count": {
          "fn": "sub",
          "args": [
            5,
            {
              "fn": "eq",
              "args": [
                {
                  "fn": "attribute",
                  "name": "bk"
                },
                2
              ]
            }
          ]
        },
        "indexAttr": "slot",
        "countAttr": ""
      }
    },
    {
      "id": "opBox",
      "type": "setBounds",
      "params": {
        "boundsMin": {
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
                                          "fn": "add",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "slot"
                                            },
                                            {
                                              "fn": "eq",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "bk"
                                                },
                                                2
                                              ]
                                            }
                                          ]
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
                                          "fn": "add",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "slot"
                                            },
                                            {
                                              "fn": "eq",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "bk"
                                                },
                                                2
                                              ]
                                            }
                                          ]
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
                                      "fn": "add",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "slot"
                                        },
                                        {
                                          "fn": "eq",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "bk"
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
                                  "fn": "add",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "slot"
                                    },
                                    {
                                      "fn": "eq",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "bk"
                                        },
                                        2
                                      ]
                                    }
                                  ]
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
                              "fn": "add",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "slot"
                                },
                                {
                                  "fn": "eq",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "bk"
                                    },
                                    2
                                  ]
                                }
                              ]
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
                      "name": "boundsMin",
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
                                      "fn": "add",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "slot"
                                        },
                                        {
                                          "fn": "eq",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "bk"
                                            },
                                            2
                                          ]
                                        }
                                      ]
                                    },
                                    0
                                  ]
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
                            },
                            {
                              "fn": "mul",
                              "args": [
                                {
                                  "fn": "eq",
                                  "args": [
                                    {
                                      "fn": "add",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "slot"
                                        },
                                        {
                                          "fn": "eq",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "bk"
                                            },
                                            2
                                          ]
                                        }
                                      ]
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
                                          "name": "boundsMin",
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
                                  "fn": "add",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "slot"
                                    },
                                    {
                                      "fn": "eq",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "bk"
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
                              "fn": "add",
                              "args": [
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
                              "fn": "add",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "slot"
                                },
                                {
                                  "fn": "eq",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "bk"
                                    },
                                    2
                                  ]
                                }
                              ]
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
                                  "name": "boundsMin",
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
                          "fn": "add",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "slot"
                            },
                            {
                              "fn": "eq",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "bk"
                                },
                                2
                              ]
                            }
                          ]
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
                              "name": "boundsMin",
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
                      "name": "boundsMin",
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
                                          "fn": "add",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "slot"
                                            },
                                            {
                                              "fn": "eq",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "bk"
                                                },
                                                2
                                              ]
                                            }
                                          ]
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
                                          "fn": "add",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "slot"
                                            },
                                            {
                                              "fn": "eq",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "bk"
                                                },
                                                2
                                              ]
                                            }
                                          ]
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
                                      "fn": "add",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "slot"
                                        },
                                        {
                                          "fn": "eq",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "bk"
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
                                  "fn": "add",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "slot"
                                    },
                                    {
                                      "fn": "eq",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "bk"
                                        },
                                        2
                                      ]
                                    }
                                  ]
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
                              "fn": "add",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "slot"
                                },
                                {
                                  "fn": "eq",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "bk"
                                    },
                                    2
                                  ]
                                }
                              ]
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
        "boundsMax": {
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
                                          "fn": "add",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "slot"
                                            },
                                            {
                                              "fn": "eq",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "bk"
                                                },
                                                2
                                              ]
                                            }
                                          ]
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
                                          "fn": "add",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "slot"
                                            },
                                            {
                                              "fn": "eq",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "bk"
                                                },
                                                2
                                              ]
                                            }
                                          ]
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
                                      "fn": "add",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "slot"
                                        },
                                        {
                                          "fn": "eq",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "bk"
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
                                  "fn": "add",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "slot"
                                    },
                                    {
                                      "fn": "eq",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "bk"
                                        },
                                        2
                                      ]
                                    }
                                  ]
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
                              "fn": "add",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "slot"
                                },
                                {
                                  "fn": "eq",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "bk"
                                    },
                                    2
                                  ]
                                }
                              ]
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
                      "name": "boundsMax",
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
                                      "fn": "add",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "slot"
                                        },
                                        {
                                          "fn": "eq",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "bk"
                                            },
                                            2
                                          ]
                                        }
                                      ]
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
                                          "name": "boundsMin",
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
                                      "fn": "add",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "slot"
                                        },
                                        {
                                          "fn": "eq",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "bk"
                                            },
                                            2
                                          ]
                                        }
                                      ]
                                    },
                                    1
                                  ]
                                },
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
                                  "fn": "add",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "slot"
                                    },
                                    {
                                      "fn": "eq",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "bk"
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
                              "fn": "add",
                              "args": [
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
                              "fn": "add",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "slot"
                                },
                                {
                                  "fn": "eq",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "bk"
                                    },
                                    2
                                  ]
                                }
                              ]
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
                                  "name": "boundsMin",
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
                          "fn": "add",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "slot"
                            },
                            {
                              "fn": "eq",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "bk"
                                },
                                2
                              ]
                            }
                          ]
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
                              "name": "boundsMin",
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
                      "name": "boundsMax",
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
                                          "fn": "add",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "slot"
                                            },
                                            {
                                              "fn": "eq",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "bk"
                                                },
                                                2
                                              ]
                                            }
                                          ]
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
                                          "fn": "add",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "slot"
                                            },
                                            {
                                              "fn": "eq",
                                              "args": [
                                                {
                                                  "fn": "attribute",
                                                  "name": "bk"
                                                },
                                                2
                                              ]
                                            }
                                          ]
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
                                      "fn": "add",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "slot"
                                        },
                                        {
                                          "fn": "eq",
                                          "args": [
                                            {
                                              "fn": "attribute",
                                              "name": "bk"
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
                                  "fn": "add",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "slot"
                                    },
                                    {
                                      "fn": "eq",
                                      "args": [
                                        {
                                          "fn": "attribute",
                                          "name": "bk"
                                        },
                                        2
                                      ]
                                    }
                                  ]
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
                              "fn": "add",
                              "args": [
                                {
                                  "fn": "attribute",
                                  "name": "slot"
                                },
                                {
                                  "fn": "eq",
                                  "args": [
                                    {
                                      "fn": "attribute",
                                      "name": "bk"
                                    },
                                    2
                                  ]
                                }
                              ]
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
        }
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
                  "fn": "add",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "slot"
                    },
                    {
                      "fn": "eq",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "bk"
                        },
                        2
                      ]
                    }
                  ]
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
        "select": 0,
        "values": [],
        "weights": [],
        "stringValue": "",
        "seed": 0
      }
    },
    {
      "id": "rfLayers",
      "type": "repeatPoints",
      "params": {
        "count": {
          "fn": "floor",
          "args": [
            {
              "fn": "div",
              "args": [
                {
                  "fn": "add",
                  "args": [
                    {
                      "fn": "attribute",
                      "name": "short"
                    },
                    1
                  ]
                },
                2
              ]
            }
          ]
        },
        "indexAttr": "layer",
        "countAttr": ""
      }
    },
    {
      "id": "rfParts",
      "type": "repeatPoints",
      "params": {
        "count": 3,
        "indexAttr": "part",
        "countAttr": ""
      }
    },
    {
      "id": "rfBox",
      "type": "setBounds",
      "params": {
        "boundsMin": {
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
                                  "name": "boundsMin",
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
                                      "name": "boundsMin",
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
                                  "name": "boundsMax",
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
                          "name": "boundsMin",
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
                      "name": "boundsMax",
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
                          "name": "boundsMin",
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
                                  "name": "boundsMin",
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
                                      "name": "boundsMin",
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
                                  "name": "boundsMax",
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
        "boundsMax": {
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
                                      "name": "boundsMin",
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
                                      "name": "boundsMax",
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
                              "name": "boundsMax",
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
                          "name": "boundsMax",
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
                          "name": "boundsMax",
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
                          "name": "boundsMax",
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
                                      "name": "boundsMin",
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
                                      "name": "boundsMax",
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
                              "name": "boundsMax",
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
      "id": "gBox",
      "type": "setBounds",
      "params": {
        "boundsMin": {
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
        "boundsMax": {
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
        }
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
                      "name": "boundsMin",
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
                      "name": "boundsMin",
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
                      "name": "boundsMin",
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
                      "name": "boundsMax",
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
                      "name": "boundsMax",
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
                      "name": "boundsMax",
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
          1
        ],
        "extraBricks": [
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
        "stepAboveAttr": "stepAbove",
        "stepCountAttr": "stepCount",
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
            68,
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
                    68,
                    {
                      "fn": "attribute",
                      "name": "step"
                    }
                  ]
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
                      "fn": "select",
                      "args": [
                        {
                          "fn": "lt",
                          "args": [
                            {
                              "fn": "attribute",
                              "name": "stepAbove"
                            },
                            0
                          ]
                        },
                        68,
                        {
                          "fn": "attribute",
                          "name": "stepAbove"
                        }
                      ]
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
        "lotBox",
        "in"
      ]
    },
    {
      "from": [
        "lotBox",
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
        "b1Cut",
        "out"
      ],
      "to": [
        "b1Fan",
        "in"
      ]
    },
    {
      "from": [
        "b1Fan",
        "out"
      ],
      "to": [
        "b1Box",
        "in"
      ]
    },
    {
      "from": [
        "b1Box",
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
        "b2Cut",
        "out"
      ],
      "to": [
        "b2Fan",
        "in"
      ]
    },
    {
      "from": [
        "b2Fan",
        "out"
      ],
      "to": [
        "b2Box",
        "in"
      ]
    },
    {
      "from": [
        "b2Box",
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
        "blkBox",
        "in"
      ]
    },
    {
      "from": [
        "blkBox",
        "out"
      ],
      "to": [
        "blkExt",
        "in"
      ]
    },
    {
      "from": [
        "blkExt",
        "out"
      ],
      "to": [
        "stFan",
        "in"
      ]
    },
    {
      "from": [
        "stFan",
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
        "stBox",
        "in"
      ]
    },
    {
      "from": [
        "stBox",
        "out"
      ],
      "to": [
        "ptFan",
        "in"
      ]
    },
    {
      "from": [
        "ptFan",
        "out"
      ],
      "to": [
        "ptBox",
        "in"
      ]
    },
    {
      "from": [
        "ptBox",
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
        "ceilBox",
        "in"
      ]
    },
    {
      "from": [
        "ceilBox",
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
        "wStart",
        "out"
      ],
      "to": [
        "bayFan",
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
        "bayFan",
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
        "bayBox",
        "in"
      ]
    },
    {
      "from": [
        "bayBox",
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
        "openBays",
        "out"
      ],
      "to": [
        "opFan",
        "in"
      ]
    },
    {
      "from": [
        "opFan",
        "out"
      ],
      "to": [
        "opBox",
        "in"
      ]
    },
    {
      "from": [
        "opBox",
        "out"
      ],
      "to": [
        "opKind",
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
        "rfLayers",
        "in"
      ]
    },
    {
      "from": [
        "rfLayers",
        "out"
      ],
      "to": [
        "rfParts",
        "in"
      ]
    },
    {
      "from": [
        "rfParts",
        "out"
      ],
      "to": [
        "rfBox",
        "in"
      ]
    },
    {
      "from": [
        "rfBox",
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
        "lotBox",
        "out"
      ],
      "to": [
        "gBox",
        "in"
      ]
    },
    {
      "from": [
        "gBox",
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
        "opKind",
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
        "pack",
        "studs"
      ],
      "to": [
        "connect",
        "studs"
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
        "connect",
        "studs"
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