var e=`{\r
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",\r
  "sections": [\r
    {\r
      "title": "ground",\r
      "controls": [\r
        {\r
          "param": "ground.countX",\r
          "label": "samples x",\r
          "min": 40,\r
          "max": 260,\r
          "step": 10\r
        },\r
        {\r
          "param": "ground.countZ",\r
          "label": "samples z",\r
          "min": 40,\r
          "max": 260,\r
          "step": 10\r
        },\r
        {\r
          "param": "ground.spacing",\r
          "label": "spacing"\r
        },\r
        {\r
          "param": "ground.origin",\r
          "label": "origin"\r
        }\r
      ]\r
    },\r
    {\r
      "title": "cells",\r
      "controls": [\r
        {\r
          "param": "cells.seed",\r
          "label": "diagram seed"\r
        }\r
      ]\r
    }\r
  ]\r
}\r
`;export{e as default};