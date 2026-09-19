var e=`{\r
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",\r
  "sections": [\r
    {\r
      "title": "scatter",\r
      "controls": [\r
        {\r
          "param": "sites.count",\r
          "label": "points",\r
          "min": 20,\r
          "max": 400,\r
          "step": 10\r
        },\r
        {\r
          "param": "sites.seed",\r
          "label": "seed"\r
        }\r
      ]\r
    },\r
    {\r
      "title": "radius — keep all three equal",\r
      "controls": [\r
        {\r
          "param": "dense.radius",\r
          "label": "radius (left)",\r
          "min": 1,\r
          "max": 9,\r
          "step": 0.25\r
        },\r
        {\r
          "param": "cells.radius",\r
          "label": "radius (middle)",\r
          "min": 1,\r
          "max": 9,\r
          "step": 0.25\r
        },\r
        {\r
          "param": "roads.radius",\r
          "label": "radius (right)",\r
          "min": 1,\r
          "max": 9,\r
          "step": 0.25\r
        }\r
      ]\r
    }\r
  ]\r
}\r
`;export{e as default};