var e=`{
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",
  "sections": [
    {
      "title": "Network",
      "controls": [
        { "param": "camps.count", "label": "Camps", "min": 8, "max": 600, "step": 1 },
        { "param": "trails.radius", "label": "Connect within", "min": 2, "max": 30, "step": 0.5, "unit": "m" }
      ]
    },
    {
      "title": "Filter",
      "controls": [
        { "param": "short.comparison", "label": "Keep edges" },
        { "param": "short.value", "label": "Length", "min": 0, "max": 30, "step": 0.5, "unit": "m" },
        { "param": "short.unreferencedPoints", "label": "Leftover points" }
      ]
    }
  ]
}
`;export{e as default};