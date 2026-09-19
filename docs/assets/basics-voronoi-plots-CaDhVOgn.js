var e=`{\r
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",\r
  "sections": [\r
    {\r
      "title": "the cloud",\r
      "controls": [\r
        { "param": "sites.count", "label": "sites", "min": 20, "max": 400, "step": 10 },\r
        { "param": "sites.seed", "label": "seed" }\r
      ]\r
    },\r
    {\r
      "title": "gather — widen until the count stops rising",\r
      "controls": [\r
        {\r
          "param": "plots.radius",\r
          "label": "radius",\r
          "description": "How far a site looks for the sites that bound it. Not a plot size: a cell is either the answer the whole cloud would give or nothing at all. Narrow it and plots vanish from the middle; widen it and they come back, then stop coming back — what is left out at that point is the hull, whose cells are unbounded.",\r
          "min": 2,\r
          "max": 24,\r
          "step": 0.5,\r
          "unit": "m"\r
        }\r
      ]\r
    },\r
    {\r
      "title": "massing",\r
      "controls": [{ "param": "massing.caps", "label": "caps" }]\r
    }\r
  ]\r
}\r
`;export{e as default};