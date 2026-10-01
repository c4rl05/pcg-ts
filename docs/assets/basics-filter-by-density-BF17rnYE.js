var e=`{\r
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",\r
  "sections": [\r
    {\r
      "title": "Scatter",\r
      "controls": [\r
        {\r
          "param": "scatter.count",\r
          "label": "Candidates",\r
          "min": 100,\r
          "max": 6000,\r
          "step": 100\r
        },\r
        {\r
          "param": "scatter.seed",\r
          "label": "Seed"\r
        }\r
      ]\r
    },\r
    {\r
      "title": "Thinning",\r
      "_comment": "Two gates pointing opposite ways, which is the whole shape of this node: 'threshold' reads a cutoff and ignores the seed, 'probabilistic' rolls per point and ignores the cutoff. The graph ships in probabilistic mode, so flipping the one enum swaps which row is on screen with nothing else moving.",\r
      "controls": [\r
        {\r
          "param": "thin.mode",\r
          "label": "Mode"\r
        },\r
        {\r
          "param": "thin.threshold",\r
          "label": "Threshold",\r
          "min": 0,\r
          "max": 1,\r
          "step": 0.01,\r
          "visibleWhen": { "thin.mode": "threshold" }\r
        },\r
        {\r
          "param": "thin.seed",\r
          "label": "Seed",\r
          "visibleWhen": { "thin.mode": "probabilistic" }\r
        }\r
      ]\r
    }\r
  ]\r
}\r
`;export{e as default};