var e=`{
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",
  "sections": [
    {
      "title": "opening",
      "controls": [{ "param": "corners.spacing", "label": "size" }]
    },
    {
      "title": "bars",
      "controls": [
        { "param": "mullionEnds.spacing", "label": "mullion span" },
        { "param": "transomEnds.start", "label": "transom from" },
        { "param": "transomEnds.end", "label": "transom to" },
        { "param": "mullionWidth.value", "label": "mullion width", "min": 0, "max": 1, "step": 0.01 },
        { "param": "transomWidth.value", "label": "transom width", "min": 0, "max": 1, "step": 0.01 }
      ]
    },
    {
      "title": "glass",
      "controls": [{ "param": "glass.distance", "label": "thickness", "min": 0.01, "max": 1, "step": 0.01 }]
    }
  ]
}
`;export{e as default};