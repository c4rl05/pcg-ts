var e=`{\r
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",\r
  "sections": [\r
    {\r
      "title": "Curve",\r
      "controls": [\r
        { "param": "curve.count", "label": "Path points", "min": 4, "max": 400, "step": 1 },\r
        { "param": "curve.wander", "label": "Wander", "min": 0, "max": 1, "step": 0.01 },\r
        { "param": "curve.frequency", "label": "Bends", "min": 0.5, "max": 8, "step": 0.1 }\r
      ]\r
    },\r
    {\r
      "title": "Surface",\r
      "_comment": "The gated rows are the ones sweepProfile's own schema documents as ignored in some mode — 'sides' means nothing to a ribbon, 'miterLimit' nothing to a perpendicular joint. A gate moves that sentence out of the hover text and onto the panel. Hiding changes nothing the graph cooks: a hidden row still holds its value.",\r
      "controls": [\r
        { "param": "skin.profile", "label": "Profile" },\r
        {\r
          "param": "skin.sides",\r
          "label": "Sides",\r
          "min": 3,\r
          "max": 64,\r
          "step": 1,\r
          "visibleWhen": { "skin.profile": "circle" }\r
        },\r
        {\r
          "param": "skin.width",\r
          "label": "Ribbon width",\r
          "min": 0.1,\r
          "max": 8,\r
          "step": 0.1,\r
          "visibleWhen": { "skin.profile": "ribbon" }\r
        },\r
        { "param": "skin.roll", "label": "Roll", "min": -1, "max": 1, "step": 0.01, "unit": "turns" },\r
        { "param": "skin.frame", "label": "Frame" },\r
        { "param": "skin.joint", "label": "Joint" },\r
        {\r
          "param": "skin.miterLimit",\r
          "label": "Miter limit",\r
          "min": 1,\r
          "max": 16,\r
          "step": 0.1,\r
          "visibleWhen": { "skin.joint": "miter" }\r
        },\r
        {\r
          "param": "skin.caps",\r
          "label": "Caps",\r
          "_comment": "The list form: caps close a hole, and only the two CLOSED profiles have one.",\r
          "visibleWhen": { "skin.profile": ["circle", "square"] }\r
        }\r
      ]\r
    }\r
  ]\r
}\r
`;export{e as default};