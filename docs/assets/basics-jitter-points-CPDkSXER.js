var e=`{\r
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",\r
  "sections": [\r
    {\r
      "title": "Lattice",\r
      "controls": [\r
        { "param": "grid.countX", "label": "Columns", "min": 2, "max": 64, "step": 1 },\r
        { "param": "grid.countZ", "label": "Rows", "min": 2, "max": 64, "step": 1 },\r
        { "param": "grid.spacing", "label": "Spacing" }\r
      ]\r
    },\r
    {\r
      "title": "Jitter",\r
      "controls": [\r
        { "param": "jitter.amount", "label": "Amount" },\r
        { "param": "jitter.seed", "label": "Seed" }\r
      ]\r
    }\r
  ]\r
}\r
`;export{e as default};