var e=`{
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",
  "sections": [
    {
      "title": "Plan",
      "controls": [
        { "param": "plan.operation", "label": "Operation" },
        { "param": "wing.center", "label": "Wing" },
        { "param": "court.center", "label": "Courtyard" },
        { "param": "court.size", "label": "Courtyard size" }
      ]
    },
    {
      "title": "Massing",
      "controls": [{ "param": "massing.distance", "label": "Height", "min": 0.5, "max": 20, "step": 0.5 }]
    }
  ]
}
`;export{e as default};