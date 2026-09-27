var e=`{
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",
  "sections": [
    {
      "title": "lattice",
      "controls": [
        { "param": "joints.countX", "label": "columns", "min": 2, "max": 16, "step": 1 },
        { "param": "joints.countY", "label": "rows", "min": 2, "max": 12, "step": 1 },
        { "param": "joints.spacing", "label": "cell" },
        { "param": "bars.radius", "label": "reach", "min": 0, "max": 12, "step": 0.1 }
      ]
    },
    {
      "title": "crossings",
      "controls": [
        { "param": "cross.tolerance", "label": "tolerance", "min": 0, "max": 1, "step": 0.001 },
        { "param": "cross.endpoints", "label": "endpoints" }
      ]
    }
  ]
}
`;export{e as default};