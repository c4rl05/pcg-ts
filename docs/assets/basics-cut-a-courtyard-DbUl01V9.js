var e=`{\r
  "_comment": "Panel spec — presentation only; the graph cooks identically without it. See shared/graphUi.ts.",\r
  "sections": [\r
    {\r
      "title": "Plan",\r
      "controls": [\r
        { "param": "plan.operation", "label": "Operation" },\r
        { "param": "wing.center", "label": "Wing" },\r
        { "param": "court.center", "label": "Courtyard" },\r
        { "param": "court.size", "label": "Courtyard size" }\r
      ]\r
    },\r
    {\r
      "title": "Massing",\r
      "controls": [{ "param": "massing.distance", "label": "Height", "min": 0.5, "max": 20, "step": 0.5 }]\r
    }\r
  ]\r
}\r
`;export{e as default};