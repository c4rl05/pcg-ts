var e=`{
  "_comment": "Panel spec \\u2014 presentation only; the graph cooks identically without it. See shared/graphUi.ts.",
  "sections": [
    {
      "title": "Scatter",
      "controls": [
        {
          "param": "scatter.count",
          "label": "Points",
          "min": 50,
          "max": 3000,
          "step": 50
        },
        {
          "param": "scatter.seed",
          "label": "Seed"
        }
      ]
    },
    {
      "title": "Neighbourhood",
      "controls": [
        {
          "param": "crowding.radius",
          "label": "Radius",
          "min": 0.5,
          "max": 15,
          "step": 0.1,
          "unit": " m"
        },
        {
          "param": "crowding.maxCount",
          "label": "Max counted",
          "min": 0,
          "max": 64,
          "step": 1
        },
        {
          "param": "crowding.includeSelf",
          "label": "Count self"
        }
      ]
    }
  ]
}
`;export{e as default};