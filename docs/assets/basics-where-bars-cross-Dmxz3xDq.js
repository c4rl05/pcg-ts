var e=`{
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",
  "sections": [
    {
      "title": "Lattice",
      "controls": [
        { "param": "joints.countX", "label": "Columns", "min": 2, "max": 16, "step": 1 },
        { "param": "joints.countY", "label": "Rows", "min": 2, "max": 12, "step": 1 },
        { "param": "joints.spacing", "label": "Cell" },
        { "param": "bars.radius", "label": "Reach", "min": 0, "max": 12, "step": 0.1 }
      ]
    },
    {
      "title": "Crossings",
      "controls": [
        { "param": "cross.tolerance", "label": "Tolerance", "min": 0, "max": 1, "step": 0.001 },
        { "param": "cross.endpoints", "label": "Endpoints" }
      ]
    }
  ]
}
`;export{e as default};