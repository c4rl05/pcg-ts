var e=`{\r
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",\r
  "sections": [\r
    {\r
      "title": "Lattice",\r
      "controls": [\r
        { "param": "joints.countX", "label": "Columns", "min": 2, "max": 16, "step": 1 },\r
        { "param": "joints.countY", "label": "Rows", "min": 2, "max": 12, "step": 1 },\r
        { "param": "joints.spacing", "label": "Cell" },\r
        { "param": "bars.radius", "label": "Reach", "min": 0, "max": 12, "step": 0.1 }\r
      ]\r
    },\r
    {\r
      "title": "Crossings",\r
      "controls": [\r
        { "param": "cross.tolerance", "label": "Tolerance", "min": 0, "max": 1, "step": 0.001 },\r
        { "param": "cross.endpoints", "label": "Endpoints" }\r
      ]\r
    }\r
  ]\r
}\r
`;export{e as default};