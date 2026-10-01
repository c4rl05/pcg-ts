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
          "max": 2000,\r
          "step": 25\r
        },\r
        {\r
          "param": "scatter.boundsMin",\r
          "label": "Bounds min"\r
        },\r
        {\r
          "param": "scatter.boundsMax",\r
          "label": "Bounds max"\r
        },\r
        {\r
          "param": "scatter.seed",\r
          "label": "Seed"\r
        }\r
      ]\r
    },\r
    {\r
      "title": "Spawn",\r
      "controls": [\r
        {\r
          "param": "spawn.assetId",\r
          "label": "Fallback asset"\r
        },\r
        {\r
          "param": "spawn.assetAttr",\r
          "label": "Split by"\r
        }\r
      ]\r
    }\r
  ]\r
}\r
`;export{e as default};