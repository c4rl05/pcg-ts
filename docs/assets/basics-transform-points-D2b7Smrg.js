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
          "max": 40,\r
          "step": 1\r
        },\r
        {\r
          "param": "grid.countZ",\r
          "label": "Rows",\r
          "min": 1,\r
          "max": 40,\r
          "step": 1\r
        },\r
        {\r
          "param": "grid.spacing",\r
          "label": "Spacing"\r
        }\r
      ]\r
    },\r
    {\r
      "title": "Transform",\r
      "controls": [\r
        {\r
          "param": "place.translate",\r
          "label": "Move"\r
        },\r
        {\r
          "param": "place.rotateEuler",\r
          "label": "Turn"\r
        },\r
        {\r
          "param": "place.scale",\r
          "label": "Size"\r
        }\r
      ]\r
    }\r
  ]\r
}\r
`;export{e as default};