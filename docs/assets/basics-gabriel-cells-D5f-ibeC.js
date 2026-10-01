var e=`{
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",
  "sections": [
    {
      "title": "Scatter",
      "controls": [
        {
          "param": "sites.count",
          "label": "Points",
          "min": 20,
          "max": 400,
          "step": 10
        },
        {
          "param": "sites.seed",
          "label": "Seed"
        }
      ]
    },
    {
      "title": "Radius — keep all three equal",
      "controls": [
        {
          "param": "dense.radius",
          "label": "Radius (left)",
          "min": 1,
          "max": 9,
          "step": 0.25
        },
        {
          "param": "cells.radius",
          "label": "Radius (middle)",
          "min": 1,
          "max": 9,
          "step": 0.25
        },
        {
          "param": "roads.radius",
          "label": "Radius (right)",
          "min": 1,
          "max": 9,
          "step": 0.25
        }
      ]
    }
  ]
}
`;export{e as default};