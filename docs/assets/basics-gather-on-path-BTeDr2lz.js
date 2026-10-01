var e=`{
  "_comment": "Panel spec for basics-gather-on-path. See shared/graphUi.ts — presentation only; the graph cooks identically without it.",
  "sections": [
    {
      "title": "Curve",
      "controls": [
        { "param": "curve.count", "label": "Points", "min": 8, "max": 400, "step": 2 },
        { "param": "curve.wander", "label": "Wander", "min": 0, "max": 1, "step": 0.01 },
        { "param": "curve.frequency", "label": "Noise scale", "min": 0.2, "max": 12, "step": 0.1 },
        { "param": "curve.variant", "label": "Variant", "min": 0, "max": 20, "step": 1 },
        { "param": "curve.size", "label": "Extent" }
      ]
    },
    {
      "title": "Bundles",
      "controls": [
        { "param": "bundles.bins", "label": "Clumps", "min": 1, "max": 40, "step": 1 },
        { "param": "bundles.amount", "label": "Pull", "min": 0, "max": 1, "step": 0.02 }
      ]
    }
  ]
}
`;export{e as default};