var e=`{
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",
  "sections": [
    {
      "title": "Islands",
      "controls": [
        { "param": "elev.value.islands", "label": "Island variant", "min": 0, "max": 20, "step": 1, "description": "Which coastline. The \`variant\` in the elevation noise's seed, hashed with the node's own seed, so it redraws the land and nothing else; the seed box moves every noise and scatter at once." },
        { "param": "moist.value.moisture", "label": "Moisture variant", "min": 0, "max": 20, "step": 1, "description": "Which wet and dry patches: redraws where forest grows and where the ground goes yellow, on the same coastline." },
        { "param": "$heightScale", "label": "Relief", "min": 2, "max": 40, "step": 1, "unit": " m" }
      ]
    },
    {
      "title": "Forest",
      "controls": [
        { "param": "$treeDensity", "label": "Density", "min": 0, "max": 2, "step": 0.05 },
        { "param": "treeSpacing.minDistance", "label": "Tree spacing", "min": 0.6, "max": 4, "step": 0.05, "unit": " m" },
        { "param": "treeSeeds.seed", "label": "Scatter re-roll", "min": 0, "max": 50, "step": 1 }
      ]
    },
    {
      "title": "Towns",
      "controls": [
        { "param": "towns.minDistance", "label": "Town spacing", "min": 10, "max": 60, "step": 1, "unit": " m" },
        { "param": "roads.radius", "label": "Road reach", "min": 20, "max": 150, "step": 1, "unit": " m" },
        { "param": "townSeeds.seed", "label": "Town re-roll", "min": 0, "max": 50, "step": 1 }
      ]
    }
  ]
}
`;export{e as default};