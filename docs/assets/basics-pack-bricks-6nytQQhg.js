var e=`{
  "formatVersion": 1,
  "seed": 1,
  "meta": {
    "title": "Pack boxes into bricks",
    "description": "Nine boxes on a stud lattice — x and z in studs, y in plates, a plate 0.4 of a stud — become the bricks that build them. \`packBricks\` fills exactly the cells the boxes cover from a catalogue of full-height bricks and plates, laying each course in the tallest piece that fits and choosing among footprints so a joint does not sit on a seam in the course below: the red wall is in running bond, not a stack. \`groupBy\` on \`color\` keeps the window its own glass bricks, and the buttress, which OVERLAPS the wall it leans on, is unioned into it rather than packed twice. Each brick is a point whose \`scale\` is its own-frame size and whose \`rot\` turns it a quarter when the entry was placed sideways, so a unit box copied onto the points draws every brick; the second output is one point per stud left showing, here a small box. \`islands\` reads 9, and that is the lesson rather than a fault: the base and the roof are laid in 2x8 plates, and the ones no wall stands on are not held by anything — counting what clutch alone joins is how a build that would come apart in the hand is found.",
    "tags": [
      "basics",
      "structure",
      "mesh"
    ]
  },
  "nodes": [
    {
      "id": "boxes",
      "type": "pointList",
      "params": {
        "positions": [
          6,
          0.2,
          4,
          2,
          3.4,
          7.5,
          9.5,
          3.4,
          7.5,
          5.5,
          1.6,
          7.5,
          5.5,
          5.8,
          7.5,
          5.5,
          4,
          7.5,
          0.5,
          3.4,
          3.5,
          6,
          6.6,
          4,
          10.5,
          2.2,
          7.5
        ],
        "columnNames": [
          "boundsMin",
          "boundsMax",
          "color"
        ],
        "columnTypes": [
          "vec3",
          "vec3",
          "vec4"
        ],
        "columnValues": [
          -2,
          0,
          -2,
          0,
          0.4,
          7,
          7,
          0.4,
          7,
          4,
          0.4,
          7,
          4,
          5.2,
          7,
          4,
          2.8,
          7,
          0,
          0.4,
          0,
          0,
          6.4,
          0,
          9,
          0.4,
          6,
          14,
          0.4,
          10,
          4,
          6.4,
          8,
          12,
          6.4,
          8,
          7,
          2.8,
          8,
          7,
          6.4,
          8,
          7,
          5.2,
          8,
          1,
          6.4,
          7,
          12,
          6.8,
          8,
          12,
          4,
          9,
          0.3,
          0.6,
          0.25,
          1,
          0.7,
          0.16,
          0.12,
          1,
          0.7,
          0.16,
          0.12,
          1,
          0.7,
          0.16,
          0.12,
          1,
          0.7,
          0.16,
          0.12,
          1,
          0.55,
          0.8,
          0.95,
          1,
          0.93,
          0.92,
          0.88,
          1,
          0.3,
          0.33,
          0.36,
          1,
          0.7,
          0.16,
          0.12,
          1
        ]
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
        "groupBy": [
          "color"
        ],
        "stagger": 3,
        "islandsAttr": "islands"
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
      "id": "brickBox",
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
      "id": "bricks",
      "type": "copyToPoints",
      "params": {
        "targetNames": [
          "color"
        ],
        "targetIndexAttr": "",
        "rotateAttrs": [],
        "sourceGroupAttr": "",
        "targetGroupAttr": "",
        "mirrorAware": true,
        "topology": "keep"
      }
    },
    {
      "id": "studBox",
      "type": "meshPrimitive",
      "params": {
        "shape": "box",
        "size": [
          0.5,
          0.17,
          0.5
        ],
        "center": [
          0,
          0.085,
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
      "id": "studs",
      "type": "copyToPoints",
      "params": {
        "targetNames": [
          "color"
        ],
        "targetIndexAttr": "",
        "rotateAttrs": [],
        "sourceGroupAttr": "",
        "targetGroupAttr": "",
        "mirrorAware": true,
        "topology": "keep"
      }
    },
    {
      "id": "build",
      "type": "mergePrimitives",
      "params": {}
    }
  ],
  "connections": [
    {
      "from": [
        "boxes",
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
        "gap",
        "in"
      ]
    },
    {
      "from": [
        "brickBox",
        "out"
      ],
      "to": [
        "bricks",
        "source"
      ]
    },
    {
      "from": [
        "gap",
        "out"
      ],
      "to": [
        "bricks",
        "target"
      ]
    },
    {
      "from": [
        "studBox",
        "out"
      ],
      "to": [
        "studs",
        "source"
      ]
    },
    {
      "from": [
        "pack",
        "studs"
      ],
      "to": [
        "studs",
        "target"
      ]
    },
    {
      "from": [
        "bricks",
        "out"
      ],
      "to": [
        "build",
        "in"
      ]
    },
    {
      "from": [
        "studs",
        "out"
      ],
      "to": [
        "build",
        "in"
      ]
    }
  ],
  "outputs": [
    {
      "id": "build",
      "pin": "out",
      "name": "build"
    }
  ]
}
`;export{e as default};