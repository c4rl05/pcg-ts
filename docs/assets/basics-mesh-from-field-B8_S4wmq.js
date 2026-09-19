var e=`{\r
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",\r
  "sections": [\r
    {\r
      "title": "the shape",\r
      "controls": [\r
        {\r
          "param": "cave.isoValue",\r
          "label": "iso value",\r
          "description": "Where the surface sits in the field. For a signed distance it is a plain offset, so this grows and shrinks the rock without re-cutting anything — the same graph, one number.",\r
          "min": -4,\r
          "max": 4,\r
          "step": 0.1\r
        }\r
      ]\r
    },\r
    {\r
      "title": "the lattice",\r
      "controls": [\r
        {\r
          "param": "cave.cellSize",\r
          "label": "cell size",\r
          "description": "Cube edge in world units, and EXACT rather than a request. Cost grows with its cube and every corner is a field evaluation, so halving it is eight times the work. It changes how finely the surface is resolved and never where the surface is.",\r
          "min": 0.25,\r
          "max": 1.5,\r
          "step": 0.05,\r
          "unit": "m"\r
        },\r
        { "param": "cave.inside", "label": "solid side" }\r
      ]\r
    }\r
  ]\r
}\r
`;export{e as default};