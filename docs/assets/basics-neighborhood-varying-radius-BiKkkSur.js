var e=`{\r
  "_comment": "Panel spec \\u2014 presentation only; the graph cooks identically without it. See shared/graphUi.ts.",\r
  "sections": [\r
    {\r
      "title": "Cloud",\r
      "controls": [\r
        {\r
          "param": "cloud.count",\r
          "label": "Points",\r
          "min": 100,\r
          "max": 4000,\r
          "step": 50\r
        },\r
        {\r
          "param": "cloud.seed",\r
          "label": "Seed"\r
        }\r
      ]\r
    },\r
    {\r
      "title": "Survey",\r
      "controls": [\r
        {\r
          "param": "survey.maxCount",\r
          "label": "Max counted",\r
          "min": 0,\r
          "max": 128,\r
          "step": 1\r
        },\r
        {\r
          "param": "survey.includeSelf",\r
          "label": "Count self"\r
        }\r
      ]\r
    }\r
  ]\r
}\r
`;export{e as default};