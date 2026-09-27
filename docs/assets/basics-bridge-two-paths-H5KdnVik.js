var e=`{
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",
  "sections": [
    {
      "title": "centreline",
      "controls": [
        { "param": "curve.wander", "label": "wander", "min": 0, "max": 1, "step": 0.01 },
        { "param": "curve.frequency", "label": "frequency", "min": 0.5, "max": 6, "step": 0.1 },
        { "param": "even.count", "label": "samples", "min": 4, "max": 400, "step": 1 }
      ]
    },
    {
      "title": "band",
      "controls": [{ "param": "road.flip", "label": "flip" }]
    }
  ]
}
`;export{e as default};