var e=`{
  "_comment": "Panel spec \\u2014 presentation only; the graph cooks identically without it. See shared/graphUi.ts.",
  "sections": [
    {
      "title": "Scatter",
      "controls": [
        {
          "param": "scatter.count",
          "label": "Candidates",
          "min": 100,
          "max": 5000,
          "step": 100
        },
        {
          "param": "scatter.boundsMin",
          "label": "Bounds min"
        },
        {
          "param": "scatter.boundsMax",
          "label": "Bounds max"
        },
        {
          "param": "scatter.seed",
          "label": "Seed"
        },
        {
          "param": "keep.seed",
          "label": "Predicate seed"
        }
      ]
    }
  ]
}
`;export{e as default};