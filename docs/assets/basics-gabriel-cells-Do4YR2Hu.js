var e=`{
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",
  "sections": [
    {
      "title": "scatter",
      "controls": [
        {
          "param": "sites.count",
          "label": "points",
          "min": 20,
          "max": 400,
          "step": 10
        },
        {
          "param": "sites.seed",
          "label": "seed"
        }
      ]
    },
    {
      "title": "radius — keep all three equal",
      "controls": [
        {
          "param": "dense.radius",
          "label": "radius (left)",
          "min": 1,
          "max": 9,
          "step": 0.25
        },
        {
          "param": "cells.radius",
          "label": "radius (middle)",
          "min": 1,
          "max": 9,
          "step": 0.25
        },
        {
          "param": "roads.radius",
          "label": "radius (right)",
          "min": 1,
          "max": 9,
          "step": 0.25
        }
      ]
    }
  ]
}
`;export{e as default};