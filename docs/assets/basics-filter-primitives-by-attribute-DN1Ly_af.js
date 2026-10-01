var e=`{\r
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",\r
  "sections": [\r
    {\r
      "title": "Network",\r
      "controls": [\r
        { "param": "camps.count", "label": "Camps", "min": 8, "max": 600, "step": 1 },\r
        { "param": "trails.radius", "label": "Connect within", "min": 2, "max": 30, "step": 0.5, "unit": "m" }\r
      ]\r
    },\r
    {\r
      "title": "Filter",\r
      "controls": [\r
        { "param": "short.comparison", "label": "Keep edges" },\r
        { "param": "short.value", "label": "Length", "min": 0, "max": 30, "step": 0.5, "unit": "m" },\r
        { "param": "short.unreferencedPoints", "label": "Leftover points" }\r
      ]\r
    }\r
  ]\r
}\r
`;export{e as default};