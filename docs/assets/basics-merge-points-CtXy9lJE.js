var e=`{\r
  "_comment": "Panel spec \\u2014 presentation only; the graph cooks identically without it. See shared/graphUi.ts.",\r
  "sections": [\r
    {\r
      "title": "Grid",\r
      "controls": [\r
        {\r
          "param": "grid.countX",\r
          "label": "Columns",\r
          "min": 1,\r
          "max": 30,\r
          "step": 1\r
        },\r
        {\r
          "param": "grid.countZ",\r
          "label": "Rows",\r
          "min": 1,\r
          "max": 30,\r
          "step": 1\r
        },\r
        {\r
          "param": "grid.spacing",\r
          "label": "Spacing"\r
        }\r
      ]\r
    },\r
    {\r
      "title": "Scatter",\r
      "controls": [\r
        {\r
          "param": "scatter.count",\r
          "label": "Points",\r
          "min": 10,\r
          "max": 1000,\r
          "step": 10\r
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