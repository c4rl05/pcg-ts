var e=`{\r
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",\r
  "sections": [\r
    {\r
      "title": "Centreline",\r
      "controls": [\r
        { "param": "curve.wander", "label": "Wander", "min": 0, "max": 1, "step": 0.01 },\r
        { "param": "curve.frequency", "label": "Frequency", "min": 0.5, "max": 6, "step": 0.1 },\r
        { "param": "even.count", "label": "Samples", "min": 4, "max": 400, "step": 1 }\r
      ]\r
    },\r
    {\r
      "title": "Band",\r
      "controls": [{ "param": "road.flip", "label": "Flip" }]\r
    }\r
  ]\r
}\r
`;export{e as default};