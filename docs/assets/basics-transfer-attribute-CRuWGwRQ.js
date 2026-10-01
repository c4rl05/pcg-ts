var e=`{
  "_comment": "Panel spec \\u2014 presentation only; the graph cooks identically without it. See shared/graphUi.ts.",
  "sections": [
    {
      "title": "Surface",
      "controls": [
        {
          "param": "ground.size",
          "label": "Size"
        },
        {
          "param": "ground.subdivisions",
          "label": "Subdivisions"
        }
      ]
    },
    {
      "title": "Samples",
      "controls": [
        {
          "param": "scatter.count",
          "label": "Points",
          "min": 50,
          "max": 2000,
          "step": 25
        },
        {
          "param": "scatter.seed",
          "label": "Seed"
        },
        {
          "param": "sampleDown.mapping",
          "label": "Mapping"
        },
        {
          "param": "sampleDown.direction",
          "label": "Direction"
        },
        {
          "param": "sampleDown.maxDistance",
          "label": "Max distance",
          "min": 0,
          "max": 100,
          "step": 1,
          "unit": " m"
        }
      ]
    }
  ]
}
`;export{e as default};