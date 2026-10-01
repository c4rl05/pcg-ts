var e=`{\r
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",\r
  "sections": [\r
    {\r
      "title": "Path",\r
      "controls": [\r
        { "param": "curve.size", "label": "Size" },\r
        { "param": "dense.count", "label": "Samples", "min": 12, "max": 1200, "step": 1 }\r
      ]\r
    },\r
    {\r
      "title": "Clip",\r
      "controls": [{ "param": "clip.minLength", "label": "Min length", "min": 0, "max": 12, "step": 0.1 }]\r
    }\r
  ]\r
}\r
`;export{e as default};