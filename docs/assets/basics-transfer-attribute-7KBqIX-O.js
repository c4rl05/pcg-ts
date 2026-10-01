var e=`{\r
  "_comment": "Panel spec \\u2014 presentation only; the graph cooks identically without it. See shared/graphUi.ts.",\r
  "sections": [\r
    {\r
      "title": "Surface",\r
      "controls": [\r
        {\r
          "param": "ground.size",\r
          "label": "Size"\r
        },\r
        {\r
          "param": "ground.subdivisions",\r
          "label": "Subdivisions"\r
        }\r
      ]\r
    },\r
    {\r
      "title": "Samples",\r
      "controls": [\r
        {\r
          "param": "scatter.count",\r
          "label": "Points",\r
          "min": 50,\r
          "max": 2000,\r
          "step": 25\r
        },\r
        {\r
          "param": "scatter.seed",\r
          "label": "Seed"\r
        },\r
        {\r
          "param": "sampleDown.mapping",\r
          "label": "Mapping"\r
        },\r
        {\r
          "param": "sampleDown.direction",\r
          "label": "Direction"\r
        },\r
        {\r
          "param": "sampleDown.maxDistance",\r
          "label": "Max distance",\r
          "min": 0,\r
          "max": 100,\r
          "step": 1,\r
          "unit": " m"\r
        }\r
      ]\r
    }\r
  ]\r
}\r
`;export{e as default};