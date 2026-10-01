var e=`{\r
  "_comment": "Panel spec \\u2014 presentation only; the graph cooks identically without it. See shared/graphUi.ts.",\r
  "sections": [\r
    {\r
      "title": "Grid",\r
      "controls": [\r
        {\r
          "param": "grid.countX",\r
          "label": "Points per row",\r
          "min": 2,\r
          "max": 40,\r
          "step": 1\r
        },\r
        {\r
          "param": "grid.countZ",\r
          "label": "Rows",\r
          "min": 1,\r
          "max": 20,\r
          "step": 1\r
        },\r
        {\r
          "param": "grid.spacing",\r
          "label": "Spacing"\r
        }\r
      ]\r
    },\r
    {\r
      "title": "Paths",\r
      "controls": [\r
        {\r
          "param": "paths.closed",\r
          "label": "Close each path"\r
        }\r
      ]\r
    }\r
  ]\r
}\r
`;export{e as default};