var e=`{\r
  "formatVersion": 1,\r
  "seed": 7,\r
  "meta": {\r
    "title": "Cut boxes into labelled pieces",\r
    "description": "\`splitBox\` CUTS every cell's box along one axis into an ordered list of LABELLED PIECES, one point per piece — the split of a split grammar, written as sizes instead of corners. A CELL IS A POINT WITH A BOX: the standard \`boundsMin\`/\`boundsMax\`. Here three blocks stand in a row, each 8 wide and as tall as its own storey count, drawn once per block. THE PIECES ARE THREE PARALLEL LISTS, one entry per segment from the min side: \`labels\`, \`sizes\` and \`units\`. \`storeys\` cuts each block in y into a plinth of 1 (\\"absolute\\"), as many storeys of 3 as the rest holds (\\"repeat\\", so a block 13.5 tall gets four) and a cornice of 0.5 (\\"absolute\\" again — absolute segments are taken first wherever they sit). A NESTED SPLIT IS ONE MORE NODE: \`bays\` cuts only the storeys in x — \`where\` is attributeIs(\\"piece\\", \\"storey\\"), so the plinth and the cornice pass through untouched, label and seed and all. Bays aim at 2.5 wide; 8 holds three of 2.67, and \`snap\` puts the two interior cuts on a 0.5 lattice, so they come out 2.5, 3 and 2.5 while the block's own ends never move. A SIZE CAN BE A FIELD, resolved on the PARENT cell, with one component per segment: \`opening\` cuts each bay in y into wall, opening and wall with \`sizes\` = vec(sill, height, 1). On the ground storey's middle bay the sill is 0 and the opening 2.4 — that is the door — and A PIECE OF ZERO SIZE IS DROPPED, so the door has no wall under it and no branch was written to say so. The last segment is \\"relative\\" with weight 1: it takes whatever the others leave, which is how a split says \\"and the rest\\". \`jambs\` cuts only the openings in x, 1 : 2 : 1 by weight, so each window and door is the middle half of its bay. Each piece keeps every attribute its cell carried — \`level\` (the storey's slot, written by the first split as its \`indexAttr\`) and \`door\` reach the pieces three splits down — and is seeded hashCombine(cellSeed, slot), exactly as repeatPoints seeds copy k, so this graph and a repeatPoints + setBounds spelling of it draw the same numbers. The pieces tile their blocks exactly, so the last nodes only draw them: a unit box per piece, centred on its box and a little smaller than it so the cuts show, an opening a fifth of the wall's depth so it reads as a recess, and every piece coloured by its label.",\r
    "tags": [\r
      "basics",\r
      "split",\r
      "bounds",\r
      "grammar"\r
    ]\r
  },\r
  "nodes": [\r
    {\r
      "id": "row",\r
      "type": "pointLine",\r
      "params": {\r
        "mode": "endpoints",\r
        "count": 3,\r
        "start": [\r
          -8,\r
          0,\r
          0\r
        ],\r
        "end": [\r
          8,\r
          0,\r
          0\r
        ]\r
      }\r
    },\r
    {\r
      "id": "blocks",\r
      "type": "setBounds",\r
      "params": {\r
        "boundsMin": {\r
          "fn": "sub",\r
          "args": [\r
            {\r
              "fn": "position"\r
            },\r
            {\r
              "fn": "vec",\r
              "args": [\r
                4,\r
                0,\r
                0.25\r
              ]\r
            }\r
          ]\r
        },\r
        "boundsMax": {\r
          "fn": "add",\r
          "args": [\r
            {\r
              "fn": "position"\r
            },\r
            {\r
              "fn": "vec",\r
              "args": [\r
                4,\r
                {\r
                  "fn": "add",\r
                  "args": [\r
                    1.5,\r
                    {\r
                      "fn": "mul",\r
                      "args": [\r
                        3,\r
                        {\r
                          "fn": "add",\r
                          "args": [\r
                            2,\r
                            {\r
                              "fn": "floor",\r
                              "args": [\r
                                {\r
                                  "fn": "mul",\r
                                  "args": [\r
                                    {\r
                                      "fn": "randomField",\r
                                      "key": "storeys"\r
                                    },\r
                                    3\r
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
                0.25\r
              ]\r
            }\r
          ]\r
        }\r
      }\r
    },\r
    {\r
      "id": "storeys",\r
      "type": "splitBox",\r
      "params": {\r
        "axis": "y",\r
        "labels": [\r
          "plinth",\r
          "storey",\r
          "cornice"\r
        ],\r
        "sizes": [\r
          1,\r
          3,\r
          0.5\r
        ],\r
        "units": [\r
          "absolute",\r
          "repeat",\r
          "absolute"\r
        ],\r
        "indexAttr": "level"\r
      }\r
    },\r
    {\r
      "id": "bays",\r
      "type": "splitBox",\r
      "params": {\r
        "axis": "x",\r
        "where": {\r
          "fn": "attributeIs",\r
          "name": "piece",\r
          "value": "storey"\r
        },\r
        "labels": [\r
          "bay"\r
        ],\r
        "sizes": [\r
          2.5\r
        ],\r
        "units": [\r
          "repeat"\r
        ],\r
        "snap": [\r
          0.5,\r
          0,\r
          0\r
        ],\r
        "indexAttr": "bay"\r
      }\r
    },\r
    {\r
      "id": "door",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "door",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 1,\r
        "value": {\r
          "fn": "mul",\r
          "args": [\r
            {\r
              "fn": "mul",\r
              "args": [\r
                {\r
                  "fn": "attributeIs",\r
                  "name": "piece",\r
                  "value": "bay"\r
                },\r
                {\r
                  "fn": "eq",\r
                  "args": [\r
                    {\r
                      "fn": "attribute",\r
                      "name": "level"\r
                    },\r
                    1\r
                  ]\r
                }\r
              ]\r
            },\r
            {\r
              "fn": "eq",\r
              "args": [\r
                {\r
                  "fn": "attribute",\r
                  "name": "bay"\r
                },\r
                1\r
              ]\r
            }\r
          ]\r
        }\r
      }\r
    },\r
    {\r
      "id": "opening",\r
      "type": "splitBox",\r
      "params": {\r
        "axis": "y",\r
        "where": {\r
          "fn": "attributeIs",\r
          "name": "piece",\r
          "value": "bay"\r
        },\r
        "labels": [\r
          "wall",\r
          "opening",\r
          "wall"\r
        ],\r
        "sizes": {\r
          "fn": "vec",\r
          "args": [\r
            {\r
              "fn": "select",\r
              "args": [\r
                {\r
                  "fn": "attribute",\r
                  "name": "door"\r
                },\r
                0,\r
                0.9\r
              ]\r
            },\r
            {\r
              "fn": "select",\r
              "args": [\r
                {\r
                  "fn": "attribute",\r
                  "name": "door"\r
                },\r
                2.4,\r
                1.5\r
              ]\r
            },\r
            1\r
          ]\r
        },\r
        "units": [\r
          "absolute",\r
          "absolute",\r
          "relative"\r
        ]\r
      }\r
    },\r
    {\r
      "id": "jambs",\r
      "type": "splitBox",\r
      "params": {\r
        "axis": "x",\r
        "where": {\r
          "fn": "attributeIs",\r
          "name": "piece",\r
          "value": "opening"\r
        },\r
        "labels": [\r
          "wall",\r
          "opening",\r
          "wall"\r
        ],\r
        "sizes": [\r
          1,\r
          2,\r
          1\r
        ],\r
        "units": [\r
          "relative",\r
          "relative",\r
          "relative"\r
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
        }\r
      }\r
    },\r
    {\r
      "id": "size",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "scale",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 3,\r
        "value": {\r
          "fn": "let",\r
          "bind": {\r
            "s": {\r
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
          },\r
          "args": [\r
            {\r
              "fn": "vec",\r
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
                              "fn": "var",\r
                              "name": "s"\r
                            }\r
                          ],\r
                          "index": 0\r
                        },\r
                        0.08\r
                      ]\r
                    },\r
                    0.01\r
                  ]\r
                },\r
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
                              "fn": "var",\r
                              "name": "s"\r
                            }\r
                          ],\r
                          "index": 1\r
                        },\r
                        0.08\r
                      ]\r
                    },\r
                    0.01\r
                  ]\r
                },\r
                {\r
                  "fn": "mul",\r
                  "args": [\r
                    {\r
                      "fn": "component",\r
                      "args": [\r
                        {\r
                          "fn": "var",\r
                          "name": "s"\r
                        }\r
                      ],\r
                      "index": 2\r
                    },\r
                    {\r
                      "fn": "select",\r
                      "args": [\r
                        {\r
                          "fn": "attributeIs",\r
                          "name": "piece",\r
                          "value": "opening"\r
                        },\r
                        0.2,\r
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
      "id": "tint",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "color",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 4,\r
        "value": {\r
          "fn": "byAttribute",\r
          "name": "piece",\r
          "cases": {\r
            "plinth": {\r
              "fn": "vec",\r
              "args": [\r
                0.32,\r
                0.3,\r
                0.3,\r
                1\r
              ]\r
            },\r
            "cornice": {\r
              "fn": "vec",\r
              "args": [\r
                0.4,\r
                0.36,\r
                0.33,\r
                1\r
              ]\r
            },\r
            "opening": {\r
              "fn": "select",\r
              "args": [\r
                {\r
                  "fn": "attribute",\r
                  "name": "door"\r
                },\r
                {\r
                  "fn": "vec",\r
                  "args": [\r
                    0.45,\r
                    0.27,\r
                    0.15,\r
                    1\r
                  ]\r
                },\r
                {\r
                  "fn": "vec",\r
                  "args": [\r
                    0.45,\r
                    0.62,\r
                    0.75,\r
                    1\r
                  ]\r
                }\r
              ]\r
            }\r
          },\r
          "default": {\r
            "fn": "vec",\r
            "args": [\r
              0.86,\r
              0.8,\r
              0.7,\r
              1\r
            ]\r
          }\r
        }\r
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
        ]\r
      }\r
    },\r
    {\r
      "id": "panels",\r
      "type": "copyToPoints",\r
      "params": {\r
        "topology": "keep"\r
      }\r
    }\r
  ],\r
  "connections": [\r
    {\r
      "from": [\r
        "row",\r
        "out"\r
      ],\r
      "to": [\r
        "blocks",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "blocks",\r
        "out"\r
      ],\r
      "to": [\r
        "storeys",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "storeys",\r
        "out"\r
      ],\r
      "to": [\r
        "bays",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "bays",\r
        "out"\r
      ],\r
      "to": [\r
        "door",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "door",\r
        "out"\r
      ],\r
      "to": [\r
        "opening",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "opening",\r
        "out"\r
      ],\r
      "to": [\r
        "jambs",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "jambs",\r
        "out"\r
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
        "size",\r
        "in"\r
      ]\r
    },\r
    {\r
      "from": [\r
        "size",\r
        "out"\r
      ],\r
      "to": [\r
        "tint",\r
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
        "tint",\r
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
      "id": "tint",\r
      "pin": "out",\r
      "name": "pieces"\r
    },\r
    {\r
      "id": "panels",\r
      "pin": "out",\r
      "name": "panels"\r
    }\r
  ]\r
}\r
`;export{e as default};