var e=`{\r
  "_comment": "Panel spec \\u2014 presentation only; the graph cooks identically without it. See shared/graphUi.ts.",\r
  "sections": [\r
    {\r
      "title": "Scatter",\r
      "controls": [\r
        {\r
          "param": "scatter.count",\r
          "label": "Points",\r
          "min": 50,\r
          "max": 3000,\r
          "step": 50\r
        },\r
        {\r
          "param": "scatter.seed",\r
          "label": "Seed"\r
        }\r
      ]\r
    },\r
    {\r
      "title": "Remap",\r
      "controls": [\r
        {\r
          "param": "fit.mode",\r
          "label": "Mode"\r
        },\r
        {\r
          "param": "fit.inMin",\r
          "label": "In min",\r
          "min": -2,\r
          "max": 2,\r
          "step": 0.05\r
        },\r
        {\r
          "param": "fit.inMax",\r
          "label": "In max",\r
          "min": -2,\r
          "max": 2,\r
          "step": 0.05\r
        },\r
        {\r
          "param": "fit.outMin",\r
          "label": "Out min",\r
          "min": -5,\r
          "max": 5,\r
          "step": 0.1\r
        },\r
        {\r
          "param": "fit.outMax",\r
          "label": "Out max",\r
          "min": -5,\r
          "max": 5,\r
          "step": 0.1\r
        },\r
        {\r
          "param": "fit.clamp",\r
          "label": "Clamp"\r
        }\r
      ]\r
    }\r
  ]\r
}\r
`;export{e as default};