var e=`{
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",
  "sections": [
    {
      "title": "The cloud",
      "controls": [
        { "param": "sites.count", "label": "Sites", "min": 20, "max": 400, "step": 10 },
        { "param": "sites.seed", "label": "Seed" }
      ]
    },
    {
      "title": "Gather — widen until the count stops rising",
      "controls": [
        {
          "param": "plots.radius",
          "label": "Radius",
          "description": "How far a site looks for the sites that bound it. Not a plot size: a cell is either the answer the whole cloud would give or nothing at all. Narrow it and plots vanish from the middle; widen it and they come back, then stop coming back — what is left out at that point is the hull, whose cells are unbounded.",
          "min": 2,
          "max": 24,
          "step": 0.5,
          "unit": "m"
        }
      ]
    },
    {
      "title": "Massing",
      "controls": [{ "param": "massing.caps", "label": "Caps" }]
    }
  ]
}
`;export{e as default};