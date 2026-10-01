var e=`{
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",
  "sections": [
    {
      "title": "Curve",
      "controls": [
        { "param": "curve.count", "label": "Path points", "min": 4, "max": 400, "step": 1 },
        { "param": "curve.wander", "label": "Wander", "min": 0, "max": 1, "step": 0.01 },
        { "param": "curve.frequency", "label": "Bends", "min": 0.5, "max": 8, "step": 0.1 }
      ]
    },
    {
      "title": "Surface",
      "_comment": "The gated rows are the ones sweepProfile's own schema documents as ignored in some mode — 'sides' means nothing to a ribbon, 'miterLimit' nothing to a perpendicular joint. A gate moves that sentence out of the hover text and onto the panel. Hiding changes nothing the graph cooks: a hidden row still holds its value.",
      "controls": [
        { "param": "skin.profile", "label": "Profile" },
        {
          "param": "skin.sides",
          "label": "Sides",
          "min": 3,
          "max": 64,
          "step": 1,
          "visibleWhen": { "skin.profile": "circle" }
        },
        {
          "param": "skin.width",
          "label": "Ribbon width",
          "min": 0.1,
          "max": 8,
          "step": 0.1,
          "visibleWhen": { "skin.profile": "ribbon" }
        },
        { "param": "skin.roll", "label": "Roll", "min": -1, "max": 1, "step": 0.01, "unit": "turns" },
        { "param": "skin.frame", "label": "Frame" },
        { "param": "skin.joint", "label": "Joint" },
        {
          "param": "skin.miterLimit",
          "label": "Miter limit",
          "min": 1,
          "max": 16,
          "step": 0.1,
          "visibleWhen": { "skin.joint": "miter" }
        },
        {
          "param": "skin.caps",
          "label": "Caps",
          "_comment": "The list form: caps close a hole, and only the two CLOSED profiles have one.",
          "visibleWhen": { "skin.profile": ["circle", "square"] }
        }
      ]
    }
  ]
}
`;export{e as default};