var e=`{\r
  "_comment": "Panel spec for basics-gather-on-path. See shared/graphUi.ts — presentation only; the graph cooks identically without it.",\r
  "sections": [\r
    {\r
      "title": "Curve",\r
      "controls": [\r
        { "param": "curve.count", "label": "Points", "min": 8, "max": 400, "step": 2 },\r
        { "param": "curve.wander", "label": "Wander", "min": 0, "max": 1, "step": 0.01 },\r
        { "param": "curve.frequency", "label": "Noise scale", "min": 0.2, "max": 12, "step": 0.1 },\r
        { "param": "curve.variant", "label": "Variant", "min": 0, "max": 20, "step": 1 },\r
        { "param": "curve.size", "label": "Extent" }\r
      ]\r
    },\r
    {\r
      "title": "Bundles",\r
      "controls": [\r
        { "param": "bundles.bins", "label": "Clumps", "min": 1, "max": 40, "step": 1 },\r
        { "param": "bundles.amount", "label": "Pull", "min": 0, "max": 1, "step": 0.02 }\r
      ]\r
    }\r
  ]\r
}\r
`;export{e as default};