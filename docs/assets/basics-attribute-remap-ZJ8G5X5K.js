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
      "title": "Remap",
      "controls": [
        {
          "param": "fit.mode",
          "label": "Mode"
        },
        {
          "param": "fit.inMin",
          "label": "In min",
          "min": -2,
          "max": 2,
          "step": 0.05
        },
        {
          "param": "fit.inMax",
          "label": "In max",
          "min": -2,
          "max": 2,
          "step": 0.05
        },
        {
          "param": "fit.outMin",
          "label": "Out min",
          "min": -5,
          "max": 5,
          "step": 0.1
        },
        {
          "param": "fit.outMax",
          "label": "Out max",
          "min": -5,
          "max": 5,
          "step": 0.1
        },
        {
          "param": "fit.clamp",
          "label": "Clamp"
        }
      ]
    }
  ]
}
`;export{e as default};