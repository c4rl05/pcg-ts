var e=`{
  "_comment": "Panel spec \\u2014 presentation only; the graph cooks identically without it. See shared/graphUi.ts.",
  "sections": [
    {
      "title": "Surface",
      "controls": [
        {
          "param": "rock.shape",
          "label": "Shape"
        },
        {
          "param": "rock.size",
          "label": "Size"
        },
        {
          "param": "rock.subdivisions",
          "label": "Subdivisions"
        }
      ]
    },
    {
      "title": "Sampling",
      "controls": [
        {
          "param": "onSurface.count",
          "label": "Points",
          "min": 50,
          "max": 4000,
          "step": 50
        },
        {
          "param": "onSurface.densityField",
          "label": "Density",
          "min": 0,
          "max": 1,
          "step": 0.01
        },
        {
          "param": "onSurface.seed",
          "label": "Seed"
        }
      ]
    }
  ]
}
`;export{e as default};