var e=`{
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",
  "sections": [
    {
      "title": "Footprint",
      "controls": [
        { "param": "plot.count", "label": "Corners", "min": 3, "max": 48, "step": 1 },
        { "param": "plot.size", "label": "Size" },
        { "param": "plot.rotate", "label": "Rotate" }
      ]
    },
    {
      "title": "Massing",
      "controls": [
        { "param": "massing.direction", "label": "Direction" },
        { "param": "massing.vector", "label": "Vector" },
        { "param": "massing.caps", "label": "Caps" },
        { "param": "massing.sides", "label": "Walls" }
      ]
    }
  ]
}
`;export{e as default};