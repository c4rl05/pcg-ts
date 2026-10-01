var e=`{
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",
  "sections": [
    {
      "title": "Path",
      "controls": [
        { "param": "curve.size", "label": "Size" },
        { "param": "dense.count", "label": "Samples", "min": 12, "max": 1200, "step": 1 }
      ]
    },
    {
      "title": "Clip",
      "controls": [{ "param": "clip.minLength", "label": "Min length", "min": 0, "max": 12, "step": 0.1 }]
    }
  ]
}
`;export{e as default};