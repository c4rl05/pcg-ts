var e=`{\r
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts. The count ceiling is deliberate: this graph costs about 14.5 us per point on the CPU, so 200k is roughly three seconds of blocked tab, which is the most a page with no cook budget should be able to ask for. The device path is what makes that count comfortable, and comparing the two is the point of the graph.",\r
  "sections": [\r
    {\r
      "title": "Cloud",\r
      "controls": [\r
        {\r
          "param": "scatter.count",\r
          "label": "Points",\r
          "min": 1000,\r
          "max": 200000,\r
          "step": 1000\r
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
      "title": "Chain",\r
      "controls": [\r
        {\r
          "param": "jitter.seed",\r
          "label": "Jitter seed"\r
        },\r
        {\r
          "param": "place.rotateEuler",\r
          "label": "Rotate"\r
        },\r
        {\r
          "param": "place.scale",\r
          "label": "Scale"\r
        }\r
      ]\r
    }\r
  ]\r
}\r
`;export{e as default};