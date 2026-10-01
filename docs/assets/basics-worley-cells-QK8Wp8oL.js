var e=`{\r
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",\r
  "sections": [\r
    {\r
      "title": "Ground",\r
      "controls": [\r
        {\r
          "param": "ground.countX",\r
          "label": "Samples x",\r
          "min": 40,\r
          "max": 260,\r
          "step": 10\r
        },\r
        {\r
          "param": "ground.countZ",\r
          "label": "Samples z",\r
          "min": 40,\r
          "max": 260,\r
          "step": 10\r
        },\r
        {\r
          "param": "ground.spacing",\r
          "label": "Spacing"\r
        },\r
        {\r
          "param": "ground.origin",\r
          "label": "Origin"\r
        }\r
      ]\r
    },\r
    {\r
      "title": "Cells",\r
      "controls": [\r
        {\r
          "param": "cells.seed",\r
          "label": "Diagram seed"\r
        }\r
      ]\r
    }\r
  ]\r
}\r
`;export{e as default};