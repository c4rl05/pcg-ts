var e=`{
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",
  "sections": [
    {
      "title": "plan",
      "controls": [
        { "param": "plan.operation", "label": "operation" },
        { "param": "wing.center", "label": "wing" },
        { "param": "court.center", "label": "courtyard" },
        { "param": "court.size", "label": "courtyard size" }
      ]
    },
    {
      "title": "massing",
      "controls": [{ "param": "massing.distance", "label": "height", "min": 0.5, "max": 20, "step": 0.5 }]
    }
  ]
}
`;export{e as default};