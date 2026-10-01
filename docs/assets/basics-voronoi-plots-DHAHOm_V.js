var e=`{\r
  "formatVersion": 1,\r
  "seed": 3307,\r
  "meta": {\r
    "title": "A scatter becomes plots, and the plots become massing",\r
    "description": "\`voronoiCells\` answers the question \`connectPoints\` leaves implicit. That node draws the EDGES between neighbouring sites; this one draws the REGIONS — the ground each site is nearer to than any other — as one closed polyline per site, which is a plot, a plate, a territory or a leaf cell. It emits closed polylines rather than N-gon faces precisely so this graph is possible: \`extrudePolygon\` reads closed polylines and nothing else, so the plan becomes massing with one more node and no conversion. The per-plot height is the other half of the lesson. \`storeys\` writes a \`height\` on the SITES, before any cell exists; every ring vertex then carries its own site's point attributes, so \`massing\` reads one value per plot and each block gets a FLAT top. Compare \`basics-extrude-polygon\`, where the same field resolves per CORNER and tilts every roof — same param, same node, and the difference is only which points carry the value. THE RADIUS IS A GATHER, NOT A PLOT SIZE. A cell is built from the sites within \`radius\` and is the answer the WHOLE cloud would have given exactly when every corner lands within \`radius / 2\` of its site — because a site further away than \`radius\` cannot be nearer than this one to any ground that close to it. Every cell is checked against that and a cell that fails is never emitted, which is the whole reason this node can exist under a partitioned cook: the operation reads only stored positions and so is zero-hop, but its footprint is DATA-DEPENDENT and no param bounds it, and the certificate is what turns that into a radius you can confirm rather than hope for. It confirms the RADIUS and not the halo: it audits the cell against the cloud the node was handed, so a halo narrower than \`radius\` withholds a site the proof assumed was seen and the cell that comes back is certified and wrong. The halo is a floor. It also explains the picture: the scatter loses its OUTER RING of plots, because a site on the outside of any finite cloud owns ground running off to infinity and NO radius certifies that. Sweep \`radius\` in the panel and watch it happen — plots appear as it widens, and then stop appearing: at 14 this cloud has settled at 99 of its 120 sites, and 18 gives exactly the same 99. The 21 it never reaches are the hull, and their absence is the honest answer rather than a bug; \`uncertifiedAttr\` counts them, which is how you tell that case from a radius simply set too small.",\r
    "tags": ["basics", "topology", "voronoi", "surface", "mesh", "attributes"]\r
  },\r
  "nodes": [\r
    {\r
      "id": "sites",\r
      "type": "pointScatterInBounds",\r
      "params": {\r
        "count": 120,\r
        "boundsMin": [-16, 0, -16],\r
        "boundsMax": [16, 0, 16]\r
      }\r
    },\r
    {\r
      "id": "storeys",\r
      "type": "setAttribute",\r
      "params": {\r
        "name": "height",\r
        "domain": "point",\r
        "type": "f32",\r
        "tupleSize": 1,\r
        "value": {\r
          "fn": "remap",\r
          "args": [\r
            {\r
              "fn": "mul",\r
              "args": [\r
                {\r
                  "fn": "randomField",\r
                  "key": "storeys"\r
                },\r
                {\r
                  "fn": "remap",\r
                  "args": [\r
                    {\r
                      "fn": "perlinNoise",\r
                      "opts": {\r
                        "frequency": 0.05,\r
                        "seed": {\r
                          "from": "node",\r
                          "variant": 1\r
                        },\r
                        "normalized": true,\r
                        "position": {\r
                          "fn": "position"\r
                        }\r
                      }\r
                    },\r
                    0.3,\r
                    0.7,\r
                    0.35,\r
                    1.0\r
                  ]\r
                }\r
              ]\r
            },\r
            0,\r
            1,\r
            0.8,\r
            15\r
          ]\r
        }\r
      }\r
    },\r
    {\r
      "id": "plots",\r
      "type": "voronoiCells",\r
      "params": {\r
        "radius": 14,\r
        "onUncertified": "drop",\r
        "areaAttr": "plotArea",\r
        "uncertifiedAttr": "openPlots"\r
      }\r
    },\r
    {\r
      "id": "massing",\r
      "type": "extrudePolygon",\r
      "params": {\r
        "distance": {\r
          "fn": "attribute",\r
          "name": "height"\r
        },\r
        "direction": "+y",\r
        "vector": [0, 1, 0],\r
        "caps": "both",\r
        "sides": true\r
      }\r
    }\r
  ],\r
  "connections": [\r
    {\r
      "from": ["sites", "out"],\r
      "to": ["storeys", "in"]\r
    },\r
    {\r
      "from": ["storeys", "out"],\r
      "to": ["plots", "in"]\r
    },\r
    {\r
      "from": ["plots", "out"],\r
      "to": ["massing", "in"]\r
    }\r
  ],\r
  "outputs": [\r
    {\r
      "id": "massing",\r
      "pin": "out",\r
      "name": "massing"\r
    },\r
    {\r
      "id": "plots",\r
      "pin": "out",\r
      "name": "plots"\r
    }\r
  ]\r
}\r
`;export{e as default};