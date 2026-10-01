var e=`{\r
  "_comment": "Panel spec \\u2014 presentation only; the graph cooks identically without it. See shared/graphUi.ts.",\r
  "sections": [\r
    {\r
      "title": "Surface",\r
      "controls": [\r
        {\r
          "param": "rock.shape",\r
          "label": "Shape"\r
        },\r
        {\r
          "param": "rock.size",\r
          "label": "Size"\r
        },\r
        {\r
          "param": "rock.subdivisions",\r
          "label": "Subdivisions"\r
        }\r
      ]\r
    },\r
    {\r
      "title": "Sampling",\r
      "controls": [\r
        {\r
          "param": "onSurface.count",\r
          "label": "Points",\r
          "min": 50,\r
          "max": 4000,\r
          "step": 50\r
        },\r
        {\r
          "param": "onSurface.densityField",\r
          "label": "Density",\r
          "min": 0,\r
          "max": 1,\r
          "step": 0.01\r
        },\r
        {\r
          "param": "onSurface.seed",\r
          "label": "Seed"\r
        }\r
      ]\r
    }\r
  ]\r
}\r
`;export{e as default};