var e=`{
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",
  "sections": [
    {
      "title": "Spacing",
      "controls": [
        { "param": "scatter.count", "label": "Candidates", "min": 200, "max": 8000, "step": 100 },
        {
          "param": "prune.minDistance",
          "label": "Min distance",
          "min": 0.5,
          "max": 10,
          "step": 0.1,
          "unit": " m"
        },
        { "param": "scatter.boundsMin", "label": "Bounds min" },
        { "param": "scatter.boundsMax", "label": "Bounds max" }
      ]
    }
  ]
}
`;export{e as default};