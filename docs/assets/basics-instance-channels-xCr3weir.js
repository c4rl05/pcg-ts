var e=`{\r
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts. \`spawn.instanceAttrs\` is deliberately absent: a stringList has no widget, so listing it would silently show nothing.",\r
  "sections": [\r
    {\r
      "title": "scatter",\r
      "controls": [\r
        { "param": "scatter.count", "label": "points", "min": 50, "max": 2000, "step": 25 },\r
        { "param": "scatter.boundsMin", "label": "bounds min" },\r
        { "param": "scatter.boundsMax", "label": "bounds max" },\r
        { "param": "scatter.seed", "label": "seed" }\r
      ]\r
    },\r
    {\r
      "title": "spawn",\r
      "controls": [\r
        { "param": "spawn.assetId", "label": "asset" },\r
        { "param": "spawn.colorAttr", "label": "colour attr" }\r
      ]\r
    }\r
  ]\r
}\r
`;export{e as default};