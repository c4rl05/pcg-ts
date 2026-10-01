var e=`{\r
  "_comment": "Panel spec \\u2014 presentation only; the graph cooks identically without it. See shared/graphUi.ts.",\r
  "sections": [\r
    {\r
      "title": "Scatter",\r
      "controls": [\r
        {\r
          "param": "scatter.density",\r
          "label": "Density",\r
          "min": 0.005,\r
          "max": 0.3,\r
          "step": 0.005,\r
          "unit": " /m\\u00b2"\r
        },\r
        {\r
          "param": "scatter.cellSize",\r
          "label": "Cell size",\r
          "min": 2,\r
          "max": 40,\r
          "step": 1,\r
          "unit": " m"\r
        },\r
        {\r
          "param": "scatter.latticeMode",\r
          "label": "Lattice"\r
        },\r
        {\r
          "param": "scatter.height",\r
          "label": "Height",\r
          "min": -10,\r
          "max": 10,\r
          "step": 0.5,\r
          "unit": " m"\r
        },\r
        {\r
          "param": "scatter.boundsMin",\r
          "label": "Bounds min"\r
        },\r
        {\r
          "param": "scatter.boundsMax",\r
          "label": "Bounds max"\r
        },\r
        {\r
          "param": "scatter.seed",\r
          "label": "Seed"\r
        }\r
      ]\r
    }\r
  ]\r
}\r
`;export{e as default};