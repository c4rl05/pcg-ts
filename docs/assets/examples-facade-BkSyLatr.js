var e=`{
  "formatVersion": 1,
  "seed": 2203,
  "meta": {
    "title": "Split a box until the pieces are small enough",
    "description": "RECURSIVE SUBDIVISION AS A ONE-RULE GRAMMAR. A split grammar is normally a function that calls itself on each half; here it is \`applyRules\` with a single rule, \`cell\`, and a graph with no cycle in it. Each round the wrapper feeds every cell labelled \`cell\` to the rule, and the rule does two things: it RELABELS the cells that are small enough to \`panel\`, a label with no rule, so they leave on \`out\` and are never fed again; and it HALVES the rest with \`splitBox\`, labelling both halves \`cell\` so the next round feeds them back. What comes out is the leaves -- the panels -- and that is what a facade needs. A CELL IS A POINT, and the box it stands for is the \`boundsMin\`/\`boundsMax\` pair every point already carries, an extent in the point's own frame about its P: \`rootCell\` writes the 24 x 15 x 0.4 panel on one point, and every split writes boxes on new points without moving them. THE CUT GOES ACROSS THE LONGEST SPAN: \`axis\` \\"longest\\" with \`longestOf\` \\"xy\\", the plane of the wall, so the depth is never a candidate. Splitting the longest span is what keeps the cells from degenerating into slivers -- cut a fixed axis and every cell ends up as tall as the facade and a finger wide -- and a square cell, where the two tie, is cut along x. WHERE TO CUT IS THE PARENT'S DECISION, and the node makes it impossible to get wrong. The cut fraction is a share of the cell in [0.34, 0.66), drawn from \`ruleRoll\` -- the number in [0, 1) applyRules writes on every cell it feeds -- and written as the relative \`sizes\` vec(f, 1 - f). \`splitBox\` resolves \`sizes\` ONCE per cell, on the PARENT, before it cuts, so both halves meet at one f32 coordinate. A fraction drawn on each child after the cut would land at two different coordinates and leave a strip that belongs to neither half or to both, with every cell still a valid box and the picture still a subdivided panel; there is no place in this rule to write that, because nothing runs between the draw and the cut. The leaves tile the root exactly -- summed area 360 against a root of 360, at every seed from 0 to 199 -- which is the assertion worth making about a subdivision and the one a picture cannot make for you. THE STOP RULE IS THE RELABEL, and it is the only thing in the rule that is about this facade: a cell becomes a \`panel\` once its longest span is 1.7 or less, or once it is nine splits deep (\`ruleDepth\`, the round the wrapper writes, is the number of splits behind a cell). The size floor alone would end it -- each half keeps at most 66% of the span it was cut from, so the longest span shrinks geometrically. The depth cap is a choice about the picture, not a guard against running forever: over seeds 0 to 199 it binds in 198, stopping about nine cells per facade (at most 19) while their longest span is still above 1.7, so the finest corners stop a split or two early. A depth cap alone would not do instead: it leaves the cells of a wide facade still wide. EVERY RELABEL COSTS A ROUND: a panel settles one round after the split that made it, so on \`out\` its \`ruleDepth\` is one more than its split count, and \`maxDepth\` 12 leaves room above the cap's ten rounds. WHAT IT IS NOT: a facade with a vocabulary. Every cell splits by the same rule, so this makes a Mondrian; \`basics-apply-rules\` is the same recursion as one rule among several -- facades, floors, panels, windows -- each with its own label. The two nodes after the grammar only draw the panels: \`joints\` is a transformBox that scales every leaf to 86% about its own centre so the joints show, and \`boxesToMesh\` builds each box as faces where it stands.",
    "tags": [
      "examples",
      "structure",
      "grammar",
      "split",
      "recursion"
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
          -12,
          0,
          -0.2
        ],
        "boundsMax": [
          12,
          15,
          0.2
        ]
      }
    },
    {
      "id": "rootLabel",
      "type": "setAttribute",
      "params": {
        "name": "piece",
        "domain": "point",
        "type": "string",
        "stringValue": "cell"
      }
    },
    {
      "id": "split",
      "type": "applyRules",
      "params": {
        "maxDepth": 12
      },
      "subgraph": {
        "graph": {
          "formatVersion": 1,
          "seed": 0,
          "nodes": [
            {
              "id": "stop",
              "type": "setAttribute",
              "params": {
                "name": "piece",
                "domain": "point",
                "type": "string",
                "values": [
                  "cell",
                  "panel"
                ],
                "value": {
                  "fn": "max",
                  "args": [
                    {
                      "fn": "ge",
                      "args": [
                        {
                          "fn": "attribute",
                          "name": "ruleDepth"
                        },
                        9
                      ]
                    },
                    {
                      "fn": "le",
                      "args": [
                        {
                          "fn": "max",
                          "args": [
                            {
                              "fn": "box",
                              "name": "sx"
                            },
                            {
                              "fn": "box",
                              "name": "sy"
                            }
                          ]
                        },
                        1.7
                      ]
                    }
                  ]
                }
              }
            },
            {
              "id": "halve",
              "type": "splitBox",
              "params": {
                "axis": "longest",
                "longestOf": "xy",
                "labels": [
                  "cell",
                  "cell"
                ],
                "sizes": {
                  "fn": "vec",
                  "args": [
                    {
                      "fn": "add",
                      "args": [
                        0.34,
                        {
                          "fn": "mul",
                          "args": [
                            0.32,
                            {
                              "fn": "attribute",
                              "name": "ruleRoll"
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
                          "fn": "add",
                          "args": [
                            0.34,
                            {
                              "fn": "mul",
                              "args": [
                                0.32,
                                {
                                  "fn": "attribute",
                                  "name": "ruleRoll"
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },
                "units": [
                  "relative",
                  "relative"
                ],
                "where": {
                  "fn": "attributeIs",
                  "name": "piece",
                  "value": "cell"
                }
              }
            }
          ],
          "connections": [
            {
              "from": [
                "stop",
                "out"
              ],
              "to": [
                "halve",
                "in"
              ]
            }
          ],
          "outputs": []
        },
        "inputs": [
          {
            "name": "cell",
            "node": "stop",
            "pin": "in"
          }
        ],
        "outputs": [
          {
            "name": "cell",
            "node": "halve",
            "pin": "out"
          }
        ]
      }
    },
    {
      "id": "joints",
      "type": "transformBox",
      "params": {
        "scale": [
          0.86,
          0.86,
          0.86
        ],
        "pivotIn": "cell",
        "pivot": [
          0.5,
          0.5,
          0.5
        ]
      }
    },
    {
      "id": "panels",
      "type": "boxesToMesh",
      "params": {}
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
        "rootLabel",
        "in"
      ]
    },
    {
      "from": [
        "rootLabel",
        "out"
      ],
      "to": [
        "split",
        "in"
      ]
    },
    {
      "from": [
        "split",
        "out"
      ],
      "to": [
        "joints",
        "in"
      ]
    },
    {
      "from": [
        "joints",
        "out"
      ],
      "to": [
        "panels",
        "in"
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