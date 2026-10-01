var e=`{\r
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",\r
  "sections": [\r
    {\r
      "title": "Cloud",\r
      "controls": [\r
        {\r
          "param": "scatter.count",\r
          "label": "Points",\r
          "min": 100,\r
          "max": 4000,\r
          "step": 50\r
        },\r
        {\r
          "param": "scatter.seed",\r
          "label": "Scatter seed"\r
        },\r
        {\r
          "param": "scatter.boundsMin",\r
          "label": "Bounds min"\r
        },\r
        {\r
          "param": "scatter.boundsMax",\r
          "label": "Bounds max"\r
        }\r
      ]\r
    },\r
    {\r
      "title": "Groups",\r
      "controls": [\r
        {\r
          "param": "groups.name",\r
          "label": "Split on"\r
        }\r
      ]\r
    }\r
  ]\r
}\r
`;export{e as default};