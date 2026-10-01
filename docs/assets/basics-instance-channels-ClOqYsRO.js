var e=`{\r
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts. \`spawn.instanceAttrs\` is deliberately absent: a stringList has no widget, so listing it would silently show nothing.",\r
  "sections": [\r
    {\r
      "title": "Scatter",\r
      "controls": [\r
        { "param": "scatter.count", "label": "Points", "min": 50, "max": 2000, "step": 25 },\r
        { "param": "scatter.boundsMin", "label": "Bounds min" },\r
        { "param": "scatter.boundsMax", "label": "Bounds max" },\r
        { "param": "scatter.seed", "label": "Seed" }\r
      ]\r
    },\r
    {\r
      "title": "Spawn",\r
      "controls": [\r
        { "param": "spawn.assetId", "label": "Asset" },\r
        { "param": "spawn.colorAttr", "label": "Colour attr" }\r
      ]\r
    }\r
  ]\r
}\r
`;export{e as default};